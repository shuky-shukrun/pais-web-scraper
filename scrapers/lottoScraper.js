const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv/config');
const Lottery = require('../classes/Lottery');
const Lotto = require('../models/Lotto');
var nodemailer = require('nodemailer');



async function updateDB () {
    let log = "";
    const browser = await puppeteer.launch({executablePath: '/usr/bin/chromium-browser'});
    const page = await browser.newPage();

    const archive = 'https://www.pais.co.il/lotto/showMoreResults.aspx?fromIndex=1&amount=99';
    const lastLotterySelector = "#moreRecordsOL > li:nth-child(1) > " +
        "div.archive_list_block.lotto_number > div:nth-child(3)";

    // navigate to the archive page and grab the most recent item
    await page.goto(archive, {waitUntil: "domcontentloaded"});
    let lastLotteryOnWeb = await page.$eval(lastLotterySelector, lotteryNum => parseInt(lotteryNum.textContent));
    log += "Last lottery in website: " + lastLotteryOnWeb + "\n";
    console.log("Last lottery in website: " + lastLotteryOnWeb);

    // CONNECT TO DATABASE
    await mongoose.connect(process.env.DB_CONNECTION,
        { useNewUrlParser: true, useUnifiedTopology: true },
        ()=> {
                log += "Connected to db!\n";
                console.log("Connected to db!");
             }
    );

    // read the last item from the database
    let lastLotteryInDB = await Lotto.find().sort({_id:-1}).limit(1);
    lastLotteryInDB = lastLotteryInDB[0];
    log += "Last existing item in DB: " + lastLotteryInDB._id + "\n";
    console.log("Last existing item in DB: " + lastLotteryInDB._id);

    // compare to check if need to scrap new lotteries
    if(lastLotteryOnWeb > lastLotteryInDB._id) {
        log += "Need to scrap " + (lastLotteryOnWeb-lastLotteryInDB._id) + " lotteries\n\n";
        console.log("Need to scrap " + (lastLotteryOnWeb-lastLotteryInDB._id) + " lotteries");

        let newScraped = await scrapLotteries(lastLotteryInDB._id + 1, lastLotteryOnWeb, page);
        for(let i = 0; i < newScraped.length; i++) {
            log += JSON.stringify(newScraped[i]) + "\n\n";
            const lotto = new Lotto(newScraped[i]);
            await lotto.save();
        }
        log += newScraped.length + "Lotteries added to database\n";
        console.log(newScraped.length + " Lotteries added to database");
    } else {
        log += "Database is up to date\n";
        console.log("Database is up to date");
    }
    sendEmail(log);
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

function sendEmail(log) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      let date = new Date(Date.now());
      var mailOptions = {
        from: 'paisAPI@gmail.com',
        to: process.env.EMAIL_ADDRESS,
        subject: 'paisAPI Log for ' + date.toUTCString(),
        text: log
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}

// RUN THE UPDATER
updateDB();