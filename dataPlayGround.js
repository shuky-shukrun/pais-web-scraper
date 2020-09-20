const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv/config');
const Lottery = require('./classes/Lottery');
const Lotto = require('./models/Lotto');


async function checkNumbers (yourNumbers, yourStrongNumber) {

    // CONNECT TO DATABASE
    await mongoose.connect(process.env.DB_CONNECTION,
        { useNewUrlParser: true, useUnifiedTopology: true },
        ()=> console.log("connected to db!")
    );

    // read the database
    let allLotteries = await Lotto.find().sort({_id: 1});

    let sumPrizes = 0;
    let lotteriesCounter = 0;
    for (const lottery of allLotteries) {
        let foundMatch = 0;
        let strong = false;
        let lotteryNumbers = lottery.winNumbers;

        lotteryNumbers.forEach(num => {
            if(yourNumbers.includes(num)) {
                foundMatch ++;
                return true;
            }
            return false;
        });
        if(foundMatch >= 3) {
            if(lottery.strongNumber == yourStrongNumber) strong = true;
            let prize = await checkPrize(lottery._id, foundMatch, strong);
            // case of 6 / 6+ with no winners
            if(prize == 0) {
                if(foundMatch == 6 && strong)
                    prize = lottery.firstPrizeReg;
                else
                    prize = lottery.secondPrizeReg;
            }
            console.log(`${lottery._id}: ${foundMatch},\tPrize: ${prize},\tNumbers: ${lotteryNumbers},   \tstrong: ${strong}`);
            sumPrizes += prize;
            lotteriesCounter ++;
        }
    }
    console.log(`\n\nSUM PRIZES: ${sumPrizes}\nTICKETS PRICE: ${allLotteries.length * 6}\nLOTTERIES COUNTER: ${lotteriesCounter}`);
    mongoose.connection.close();
}

async function checkPrize(id, counter, strong) {
    const lottery = await Lotto.findById(id);
    const counterStr = getCounterStr(counter, strong);
    return lottery.winTableReg[counterStr].sumPrize;
}

function getCounterStr(counter, strong) {
    switch (counter){
        case 3:
            return strong ? 'threePlus' : 'three';
        case 4:
            return strong ? 'fourPlus' : 'four';
        case 5:
            return strong ? 'fivePlus' :'five';
        case 6:
            return strong ? 'sixPlus' : 'six';
    }
}

/*****************************************************************************/

async function findAvgWinnersSixAndSixPlus () {

    // CONNECT TO DATABASE
    await mongoose.connect(process.env.DB_CONNECTION,
        { useNewUrlParser: true, useUnifiedTopology: true },
        ()=> console.log("connected to db!")
    );

    // read the database
    let allLotteries = await Lotto.find().sort({_id: 1});

    let sumSixWinners = 0;
    let max = 0;
    lotteryNumber = 0;
    for (const lottery of allLotteries) {
        sumSixWinners += lottery.winTableReg.six.winners;
        sumSixWinners += lottery.winTableReg.sixPlus.winners;
        sumSixWinners += lottery.winTableDouble.six.winners;
        sumSixWinners += lottery.winTableDouble.sixPlus.winners;

        if(sumSixWinners > max){
            if(sumSixWinners == 128) {
                sumSixWinners = 0;
                continue;
            }
            max = sumSixWinners;
            lotteryNumber = lottery._id;
        }
        sumSixWinners = 0;
    }
    // const avgWinners = sumSixWinners / (1.0 * allLotteries.length);
    // console.log(`\n\nNUM LOTTERIES: ${allLotteries.length}\nAVG WINNERS: ${avgWinners}`);
    console.log(`\n\nMAX: ${max}\nLOTTERY NUM: ${lotteryNumber}`);

    mongoose.connection.close();
}

const yourNumbers = [13,14, 15, 16, 17, 18];
const yourStrongNumber = 2;
// RUN THE SCRIPT
checkNumbers(yourNumbers, yourStrongNumber);
// findAvgWinnersSixAndSixPlus();
