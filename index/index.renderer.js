var nodeConsole = require('console');
var myConsole = new nodeConsole.Console(process.stdout, process.stderr);

const { app, screen, shell } = require('electron').remote;
const {ipcRenderer, desktopCapturer} = require('electron')
var config = require('../config/config.json');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AWS = require('aws-sdk');
const Store  = require('electron-store');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
//worried this may only work on windows due to OSX path structure
store = new Store(app.getPath('userData') + '/config.json')

var group_date = "";
var hasStarted = false;
var cronInterval = 0;
let randomInterval = 0;

//variables for logging
var screenshotsTaken = 0
var screenshotsSent = 0
var sessionTimer = process.hrtime()
var elapsedSessionTime = 0

const key = config.do_space_key; // move to some secure place
const token = config.do_space_token; // move to some secure place
const startTimeInterval = 15000; // add to configuration
const endTimeInterval = 30000; // add to configuration
var active = false;

//create endpoint
const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint('ams3.digitaloceanspaces.com'),
  accessKeyId: key,
  secretAccessKey: token
});

function takeScreenShot() {
  const thumbSize = determineScreenShotSize();
  let options = { types: ['screen'], thumbnailSize: thumbSize };

  desktopCapturer.getSources(options).then(async sources => {
    sources.forEach(source => {
      if (source.name === 'Entire Screen' || source.name === 'Screen 1') {
        const fileName = `screenshot-${new Date().getTime()}.png`;
        const screenshotPath = path.join(os.tmpdir(), fileName);

        fs.writeFile(screenshotPath, source.thumbnail.toPNG(), (error) => {
          if (error) console.log(error)
          else{ //success
            screenshotsTaken += 1

            //compress image
            imagemin([screenshotPath], screenshotPath, {
              plugins: [
                imageminPngquant()
              ]
            })

            const params = {
              Body: fs.readFileSync(screenshotPath),
              Bucket: 'alteredstack/dd/' + store.get("user.id") + '/' + group_date,
              Key: fileName,
            };

            s3.putObject(params, function(err, data) {
              if (err) myConsole.log(err, err.stack)
              else {
                screenshotsSent += 1
                //File was sent to Digital Ocean and will be deleted from temp dir.
                myConsole.log(data)

                // fs.unlink(screenshotPath, (err) => {
                //   if (err) {
                //     console.error(err)
                //   }
                //   else console.log('File was sent and deleted from your temp file')
                // })
              }
            });
          }
        });
      }
      else {
          console.log("failed to get source")
      }
    });
  });
}

function cron() {
  if (hasStarted) {

    // var d = new Date();

    // var h = d.getHours();
    // var m = d.getMinutes();

    // h = (h < 10) ? "0" + h : h;
    // m = (m < 10) ? "0" + m : m;

    // console.log(h + ":" + m + "took screenshot ");

    takeScreenShot();
    // console.log("took screenshot");
    
    randomInterval = randomIntFromInterval(startTimeInterval, endTimeInterval);
    cronInterval = setTimeout(cron, randomInterval);
    // console.log(randomInterval/1000);
    
  }
}

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function toggleStartBtn() {
  group_date = new Date().getFullYear() + "-" + (parseInt(new Date().getMonth()+1)) + "-" + new Date().getDate() + "@" + new Date().getHours() + ":" + new Date().getMinutes()
  hasStarted = !hasStarted;
  if (hasStarted) {
    //start timer
    sessionTimer = process.hrtime()
    //prompts border to start and minimzes window
    ipcRenderer.send('start-timelapse')
    document.getElementById('work-status').textContent = "Start coding!!! :) Work has started"
    randomInterval = randomIntFromInterval(startTimeInterval, endTimeInterval);
    document.getElementById('start-btn').textContent = 'Stop Work';
    cron();
  } else {
    elapsedSessionTime = parseHrtimeToSeconds(process.hrtime(sessionTimer));
    sendLogData()
    //prompts border to stop
    ipcRenderer.send('stop-timelapse')
    document.getElementById('work-status').textContent = ""
    document.getElementById('start-btn').textContent = 'Start Work';
    clearInterval(cronInterval);
    randomInterval = null;
    cronInterval = null;
  }
}

function determineScreenShotSize() {
  const screenSize = screen.getPrimaryDisplay().workAreaSize;
  const maxDimension = Math.max(screenSize.width, screenSize.height);
  return {
    width: maxDimension * window.devicePixelRatio,
    height: maxDimension * window.devicePixelRatio,
  };
}

const newWindowBtn = document.getElementById('start-btn');
const logoutBtn = document.getElementById('logout-btn');

newWindowBtn.addEventListener('click', event => {
  toggleStartBtn()
});

function logout() {
    store.delete('user.session_stamp')
    store.delete('user.hashed_code')
    ipcRenderer.send('logout')
}

logoutBtn.addEventListener('click', event => {
  logout();
});

function sendLogData() {
  var log = {
    'screenshotsTaken' : screenshotsTaken,
    'screenshotsSent' : screenshotsSent,
    'sessionTimeSec' : elapsedSessionTime
  }

  console.log(log)

  const params = {
    Body: JSON.stringify(log),
    Bucket: 'alteredstack/dd/' + store.get("user.id") + '/' + group_date,
    Key: 'logdata.json',
    ContentType: "application/json"
  };

  s3.putObject(params, function(err, data) {
    console.log(JSON.stringify(err) + " " + JSON.stringify(data))
  })

  screenshotsTaken = 0
  screenshotsSent = 0
}

function parseHrtimeToSeconds(hrtime) {
  var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
  return seconds;
}