const { app, desktopCapturer, screen, shell } = require('electron').remote;
const {ipcRenderer} = require('electron')
const fs = require('fs');
const os = require('os');
const path = require('path');
const AWS = require('aws-sdk');
const Store  = require('electron-store');
//worried this may only work on windows due to OSX path structure
store = new Store(app.getPath('userData') + '/config.json')

var nodeConsole = require('console');
var myConsole = new nodeConsole.Console(process.stdout, process.stderr);

require('dotenv').config();

var group_date = "";
var hasStarted = false;

var cronInterval = 0;
let randomInterval = 0;
var counter = 0;
const key = process.env.do_space_key; // move to some secure place
const token = process.env.do_space_token; // move to some secure place
const startTimeInterval = 15000; // add to configuration
const endTimeInterval = 30000; // add to configuration

function takeScreenShot() {
  // screenshotMsg.textContent = 'Gathering screens...'
  console.log('Gathering screens...');
  const thumbSize = determineScreenShotSize();
  let options = { types: ['screen'], thumbnailSize: thumbSize };
//   const spacesEndpoint = new AWS.Endpoint('space.alteredstack.com/');
  const spacesEndpoint = new AWS.Endpoint('ams3.digitaloceanspaces.com');

  desktopCapturer.getSources(options, (error, sources) => {
    if (error) return console.log(error);

    sources.forEach(source => {
      if (source.name === 'Entire screen' || source.name === 'Screen 1') {
        const fileName = `screenshot-${new Date().getTime()}.png`;
        const screenshotPath = path.join(os.tmpdir(), fileName);

        fs.writeFile(screenshotPath, source.thumbnail.toPNG(), (error, data) => {
            if (error) return console.log(error);

            const s3 = new AWS.S3({
              endpoint: spacesEndpoint,
              accessKeyId: key,
              secretAccessKey: token,
            });

            const params = {
              Body: fs.readFileSync(screenshotPath),
              Bucket: `alteredstack/dd/` + store.get("user.id") + '/' + group_date,
              Key: fileName,
            };

            s3.putObject(params, function(err, data) {
              if (err) console.log(err, err.stack);
              else console.log(data);
            });

            const message = `Saved screenshot to: ${screenshotPath}`;
            // screenshotMsg.textContent = message
            console.log(message);
          },
        );
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
    document.getElementById('work-status').textContent = "Start coding!!! :) Work has started"
    randomInterval = randomIntFromInterval(startTimeInterval, endTimeInterval);
    document.getElementById('start-btn').textContent = 'Stop Work';
    cron();
  } else {
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


function logout() {
  store.delete('user.session_stamp')
  store.delete('user.hashed_code')
  ipcRenderer.send('logout')
}

newWindowBtn.addEventListener('click', event => {
  toggleStartBtn();
});

logoutBtn.addEventListener('click', event => {
  logout();
});
