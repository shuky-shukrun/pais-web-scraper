const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv/config');
const Lottery = require('./classes/Lottery');
const Lotto = require('./models/Lotto');


async function checkNumbers () {

    // CONNECT TO DATABASE
    await mongoose.connect(process.env.DB_CONNECTION,
        { useNewUrlParser: true, useUnifiedTopology: true },
        ()=> console.log("connected to db!")
    );

    // read the database
    let allLotteries = await Lotto.find().sort({_id: 1});

    const yWinNumbers = [1, 9, 16, 23, 27, 31];
    const yStrongNumber = 2;

    let sumPrizes = 0;
    let sumCounter = 0;
    for (const lottery of allLotteries) {
        let counter = 0;
        let strong = false;
        let lWinNumbers = lottery.winNumbers;

        lWinNumbers.forEach(num => {
            if(yWinNumbers.includes(num)) {
                counter ++;
                return true;
            }
            return false;
        });
        if(counter >= 3) {
            if(lottery.strongNumber == yStrongNumber) strong = true;
            let prize = await checkPrize(lottery._id, counter, strong);
            // case of 6 / 6+ with no winners
            if(prize == 0) {
                if(counter == 6 && strong)
                    prize = lottery.firstPrizeReg;
                else
                    prize = lottery.secondPrizeReg;
            }
            console.log(`${lottery._id}: ${counter},\tPrize: ${prize},\tNumbers: ${lWinNumbers},   \tstrong: ${strong}`);
            sumPrizes += prize;
            sumCounter ++;
        }
    }
    console.log(`\n\nSUM PRIZES: ${sumPrizes}\nTICKETS PRICE: ${allLotteries.length * 6}\nLOTTERIES COUNTER: ${sumCounter}`);
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

// RUN THE SCRIPT
checkNumbers();
