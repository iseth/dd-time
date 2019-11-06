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
const ioHook = require('iohook')
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
var appTimer = process.hrtime()
var elapsedSessionTime = 0
var keystrokes = 0

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

async function takeScreenShot() {
  const thumbSize = determineScreenShotSize();
  let options = { types: ['screen'], thumbnailSize: thumbSize };

  desktopCapturer.getSources(options).then(async sources => {
    sources.forEach(source => {
      console.log(source)
      if (source.name === 'Entire Screen' || source.name === 'Screen 1') {
        const fileName = `screenshot-${new Date().getTime()}.png`;
        const screenshotPath = path.join(os.tmpdir(), fileName);

        fs.writeFile(screenshotPath, source.thumbnail.toPNG(), (error) => {
          if (error) console.log(error)
          else{ //success
            screenshotsTaken += 1

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

                fs.unlink(screenshotPath, (err) => {
                  if (err) {
                    console.error(err)
                  }
                  else console.log('File was sent and deleted from your temp file')
                })
              }
            });
          }
        });
      }
      else {
          console.log("Did not capture " + source)
      }
    });
  });
}

function cron() {
  if (hasStarted) {
    takeScreenShot();    
    randomInterval = randomIntFromInterval(startTimeInterval, endTimeInterval);
    cronInterval = setTimeout(cron, randomInterval);    
  }
}

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function toggleStartBtn() {
  group_date = new Date().getFullYear() + "-" + (parseInt(new Date().getMonth()+1)) + "-" + new Date().getDate() + "@" + new Date().getHours() + ":" + new Date().getMinutes()
  hasStarted = !hasStarted;
  changeWorkInterface(hasStarted)
  if (hasStarted) {
    //reset logging
    screenshotsTaken = 0
    screenshotsSent = 0
    keystrokes = 0
    //start timer
    sessionTimer = process.hrtime()
    //begin screen shotting
    cron();
  } else {
    //stop timer
    elapsedSessionTime = parseHrtime(sessionTimer);
    //log session data to DO
    sendLogData()
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

async function sendLogData() {
  var log = {
    'user' : store.get("user.id"),
    'screenshotsTaken' : screenshotsTaken,
    'screenshotsSent' : screenshotsSent,
    'sessionTimeSec' : elapsedSessionTime,
    'keystrokes' : keystrokes,
    'os platform' : os.platform(),
    'os release' : os.release(),
    'appTimeSec' : process.hrtime(appTimer)[0]
  }
  //console.log(log)
  const params = {
    Body: JSON.stringify(log),
    Bucket: 'alteredstack/dd/' + store.get("user.id") + '/' + group_date,
    Key: 'logdata.json',
    ContentType: "application/json"
  };

  await uploadToDO(params)
  .then((data) => console.log(JSON.stringify(data)))
  .catch((err) => console.log(JSON.stringify(err)))
}

function parseHrtime(hrtime) {
  var seconds = process.hrtime(hrtime)
  return seconds[0];
}

function uploadToDO(params) {
  return new Promise(resolve => console.log('hello'))//s3.putObject(params).promise()
}

function changeWorkInterface(hasStarted){
  if (hasStarted){
    document.getElementById('work-status').textContent = "Start coding!!! :) Work has started"
    randomInterval = randomIntFromInterval(startTimeInterval, endTimeInterval);
    document.getElementById('start-btn').textContent = 'Stop Work';
    //prompts border to start and minimzes window
    ipcRenderer.send('start-timelapse')
  }
  else{
    document.getElementById('work-status').textContent = ""
    document.getElementById('start-btn').textContent = 'Start Work';
    //prompts border to stop
    ipcRenderer.send('stop-timelapse')
  }
}

ioHook.on('keydown', event => {
  keystrokes += 1
});

ioHook.start();