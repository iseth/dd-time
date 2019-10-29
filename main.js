const {app, BrowserWindow, ipcMain} = require('electron')

var mainWindow = null
var login = null

function createWindows() {
    mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    })

    mainWindow.loadFile('index/index.html')

    mainWindow.on('closed', () => {
        mainWindow = null
        app.quit()
    })

    login = new BrowserWindow({
        height: 600,
        width: 800,
        frame: false,
        webPreferences: {
            nodeIntegration: true
        }
    })

    login.loadFile('login/login.html')
}

app.on('ready', createWindows)

app.on('window-all-closed', () =>{
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if(process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindows()
    }
})

ipcMain.on('login-success', (event, arg) => {
    if(arg == 'ping'){
        console.log('ipcmain')
        mainWindow.show()
        login.hide()
    }
})

ipcMain.on('logout', ()=> {
    app.relaunch()
    app.exit();
})

ipcMain.on('quit-button-pressed', () => {
    app.exit(0)
})