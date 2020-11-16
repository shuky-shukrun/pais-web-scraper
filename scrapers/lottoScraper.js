const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv/config');
const Lottery = require('../classes/Lottery');
const Lotto = require('../models/Lotto');


async function updateDB () {
    const browser = await puppeteer.launch({executablePath: '/usr/bin/chromium-browser'});
    const page = await browser.newPage();

    const archive = 'https://www.pais.co.il/lotto/showMoreResults.aspx?fromIndex=1&amount=99';
    const lastLotterySelector = "#moreRecordsOL > li:nth-child(1) > " +
        "div.archive_list_block.lotto_number > div:nth-child(3)";

    // navigate to the archive page and grab the most recent item
    await page.goto(archive, {waitUntil: "domcontentloaded"});
    let lastLotteryOnWeb = await page.$eval(lastLotterySelector, lotteryNum => parseInt(lotteryNum.textContent));
    console.log("last lottery in website: " + lastLotteryOnWeb);

    // CONNECT TO DATABASE
    await mongoose.connect(process.env.DB_CONNECTION,
        { useNewUrlParser: true, useUnifiedTopology: true },
        ()=> console.log("connected to db!")
    );

    // read the last item from the database
    let lastLotteryInDB = await Lotto.find().sort({_id:-1}).limit(1);
    lastLotteryInDB = lastLotteryInDB[0];
    console.log("Last existing item in DB: " + lastLotteryInDB._id);

    // compare to check if need to scrap new lotteries
    if(lastLotteryOnWeb > lastLotteryInDB._id) {
        console.log("need to scrap " + (lastLotteryOnWeb-lastLotteryInDB._id) + " lotteries");

        let newScraped = await scrapLotteries(lastLotteryInDB._id + 1, lastLotteryOnWeb, page);

        for(let i = 0; i < newScraped.length; i++) {
            const lotto = new Lotto(newScraped[i]);
            await lotto.save();
        }
        console.log(newScraped.length + " Added to database");
    } else {
        console.log("Database is up to date");
    }
    mongoose.connection.close();
    await browser.close();
}


async function scrapLotteries(from, to, page) {

    const url = 'https://www.pais.co.il/lotto/currentlotto.aspx?lotteryId=';

    let lotteriesArr = [];

    // May 2011: 2251
    for (let lotteryNumber = from; lotteryNumber <= to; lotteryNumber++) {

        await page.goto(url + lotteryNumber,{waitUntil: "domcontentloaded"});
        let lottery = await Lottery.build(lotteryNumber, url + lotteryNumber, page);
        let lotteryJson = lottery.getAs('Json');
        lotteriesArr.push(lotteryJson);
        console.log("Lottery " + lotteryNumber + " scraped");
    }
    return lotteriesArr;
}


// RUN THE UPDATER
updateDB();