// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron')
const Store  = require('electron-store');
const { autoUpdater } = require('electron-updater');

require('update-electron-app')({
  repo: 'devduo/timelapse',
  updateInterval: '1 hour',
  logger: require('electron-log')
})

const schema = {
	windowBounds: {
		type: 'number',
		maximum: 100,
		minimum: 1,
		default: 50
	},
	user: {
		default: {
			hashed_code: undefined,
			session_stamp: undefined
		}
	}
};


const store = new Store({schema});

if (store.get("user.session_stamp") === undefined) {
  const login = require('./login')
  login
  console.log("login is loading");
}
else {
  const index = require('./index')
  index
  console.log("index is loading");
}

ipcMain.on('asynchronous-message', (event, arg) => {
  app.relaunch()
  app.exit(0)
})