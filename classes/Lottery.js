class Lottery {

    constructor (async_param) {
        if (typeof async_param === 'undefined') {
            throw new Error('Cannot be called directly. Use static method Lottery.build() instead');
        }
        this._id = async_param.num;
        this.url = async_param.url;
        this.page = async_param.page;
        this.date = async_param.date;
        this.winNumbers = async_param.winNumbers;
        this.strongNumber = async_param.strongNumber;
        this.prizes = async_param.prizes;
        this.winTableReg = async_param.winTableReg;
        this.winTableDouble = async_param.winTableDouble;
    }

    static async build (num, url, page) {
        let async_result = {};
        async_result.num = num;
        async_result.url = url;

        async_result.date = await setDate(page).catch(err => {
            console.log("Cant parse date. Lottery #" + num + "\nError: " + err);});
        async_result.winNumbers = await setWinNumbers(page).catch(err => {
            console.log("Cant parse win numbers. Lottery #" + num + "\nError: " + err);});
        async_result.strongNumber = await setStrongNumber(page).catch(err => {
            console.log("Cant parse strong number. Lottery #" + num + "\nError: " + err);});
        async_result.prizes = await setBigPrizes(page).catch(err => {
            console.log("Cant parse prizes. Lottery #" + num + "\nError: " + err);});
        async_result.winTableReg = await setWinTable(page, false).catch(err => {
            console.log("Cant parse regular win table. Lottery #" + num + "\nError: " + err);});
        async_result.winTableDouble = await setWinTable(page, true).catch(err => {
            console.log("Cant parse double win table. Lottery #" + num + "\nError: " + err);});

        return new Lottery(async_result);
    }


    getNum() {
        return this._id;
    }

    getUrl() {
        return this.url;
    }

    getPage(){
        return this.page;
    }

    getDate() {
        return this.date;
    }

    getWinNumbers() {
        return this.winNumbers;
    }

    getStrongNumber() {
        return this.strongNumber;
    }

    getFirstPrizeReg() {
        return this.prizes.firstPrizeReg;
    }

    getFirstPrizeDouble() {
        return this.prizes.firstPrizeDouble;
    }

    getSecondPrizeReg() {
        return this.prizes.secondPrizeReg;
    }

    getSecondPrizeDouble() {
        return this.prizes.secondPrizeDouble;
    }

    getSumGivenPrizes() {
        return this.prizes.sumGivenPrizes;
    }

    getWinTableReg() {
        return this.winTableReg;
    }

    getWinTableDouble() {
        return this.winTableDouble;
    }

    getAs(format) {

        let res;
        switch(format.toLowerCase()) {
            case 'json':
                let jsonLottery = {};
                jsonLottery._id = this._id;
                jsonLottery.url = this.url;
                jsonLottery.date = this.date;
                jsonLottery.winNumbers = this.winNumbers;
                jsonLottery.strongNumber = this.strongNumber;
                jsonLottery.firstPrizeReg = this.getFirstPrizeReg();
                jsonLottery.firstPrizeDouble = this.getFirstPrizeDouble();
                jsonLottery.secondPrizeReg = this.getSecondPrizeReg();
                jsonLottery.secondPrizeDouble = this.getSecondPrizeDouble();
                jsonLottery.sumGivenPrizes = this.getSumGivenPrizes();
                jsonLottery.winTableReg = this.winTableReg;
                jsonLottery.winTableDouble = this.winTableDouble;

                res = jsonLottery;
                break;
        }
        return res;
    }
}


// "private" async functions for the initialization of Lottery objects
// the following functions are not exported and cannot be used outside of this file


async function setDate(page) {
    // get date
    let dateStr = await page.$eval("body > div.content_section.cat_list >" + 
        " div.content_group.cat_h_content.w-clearfix > div.cat_h_content_big.w-clearfix >" + 
        " div:nth-child(2) > div > div:nth-child(2) > strong", 
            date => date.textContent.replace(/,/g, ''));
    let dateArr = dateStr.split("/");
    console.log(dateArr);

    let newDate = new Date(1990,0,1);
    newDate.setUTCFullYear(dateArr[2], dateArr[1]-1, dateArr[0]);
    newDate.setUTCHours(12);
    
    return newDate;
}

async function setWinNumbers(page) {
    let winNumbers = await page.$$eval('.loto_info_num', liItems => liItems.map(numbers => parseInt(numbers.textContent)));
    return winNumbers.slice(1, 7);
}

async function setStrongNumber(page){
    return await page.$eval("body > div.content_section.cat_list > " + 
        "div.content_group.cat_h_content.w-clearfix > div.cat_h_content_big.w-clearfix > " +
        "div.current_lottery_numgroup.w-clearfix > div.cat_h_data_group.strong_num.current > " + 
        "div.cat_data_info > div > div",
            strong => parseInt(strong.textContent));
}

async function setBigPrizes(page) {
    // define selectors
    const baseSelector = "body > div.content_section.cat_list > div.content_group.cat_h_content." + 
        "w-clearfix > div.cat_h_content_big.w-clearfix > div.archive_open_info.current_info.w-clearfix";
    const fprSelector = baseSelector + " > div:nth-child(2) > div > strong:nth-child(1)";
    const fpdSelector = baseSelector + " > div:nth-child(2) > div > strong:nth-child(2)";
    const sprSelector = baseSelector + " > div:nth-child(3) > div > strong:nth-child(1)";
    const spdSelector = baseSelector + " > div:nth-child(3) > div > strong:nth-child(2)";
    const sumPrizesSelector = baseSelector + " > div:nth-child(4) > div > strong";


    // extract and assign to object

    let prizesObj = {};
    prizesObj.firstPrizeReg = await extractPrize(fprSelector, 'first prize reg', page);
    prizesObj.firstPrizeDouble = await extractPrize(fpdSelector, 'first prize double', page);
    prizesObj.secondPrizeReg = await extractPrize(sprSelector, 'second prize reg', page);
    prizesObj.secondPrizeDouble = await extractPrize(spdSelector, 'second prize double', page);
    prizesObj.sumGivenPrizes = await extractPrize(sumPrizesSelector, 'sum prizes', page);

    return prizesObj;
}

async function extractPrize(selector, type, page) {
    try {
        let t = await page.$eval(selector, p => parseInt(p.textContent.replace(/,/g, '')));
        console.log(type + ": " + t);
        return t;
    }
    catch(err) {
        console.error("can't parse " + type);
        return null;
    }
}

async function setWinTable(page, double = false) {
    let selector = double == false ? '#regularLottoList' : '#doubleLottoList';
    let winTableObj = {};
    
    for (let index = 1; index < 9; index++) {
        let winnersSelector = selector + ' > li:nth-child(' + index + ') > div:nth-child(3) > div:nth-child(2)';
        let sumPrizeSelector = selector + ' > li:nth-child(' + index + ') > div:nth-child(5) > div:nth-child(2)'; 
        let winners = await page.$eval(winnersSelector, winners => parseInt(winners.textContent.replace(/,/g, '')));
        let sumPrize = await page.$eval(sumPrizeSelector, prize => parseInt(prize.textContent.replace(/,/g, '')));

        switch(index) {
            case 1:
                winTableObj.sixPlus = {winners: winners, sumPrize: sumPrize};
                break;
            case 2:
                winTableObj.six = {winners: winners, sumPrize: sumPrize};
                break;    
            case 3:
                winTableObj.fivePlus = {winners: winners, sumPrize: sumPrize};
                break;
            case 4:
                winTableObj.five = {winners: winners, sumPrize: sumPrize};
                break;
            case 5:
                winTableObj.fourPlus = {winners: winners, sumPrize: sumPrize};
                break;
            case 6:
                winTableObj.four = {winners: winners, sumPrize: sumPrize};
                break;
            case 7:
                winTableObj.threePlus = {winners: winners, sumPrize: sumPrize};
                break;
            case 8:
                winTableObj.three = {winners: winners, sumPrize: sumPrize};
                break;
        }
    }
    return winTableObj;
}


module.exports = Lottery;