const {app, BrowserWindow, ipcMain, screen} = require('electron')

var mainWindow = null
var login = null
var border = null

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

function createBorder() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    border = new BrowserWindow({
        frame: false,
        toolbar: false,
        transparent: true,
        show: false,
        width: width,
        height: height,
        resizable: false,
        movable: false,
        minimizable: false,
        alwaysOnTop: true,
        skipTaskbar: true
    })
    border.setMenu(null)
    border.setIgnoreMouseEvents(true, {forward: true})
    border.loadFile('index/border.html')
}

//required for border to work on Linux
app.disableHardwareAcceleration()

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
        createBorder()
        mainWindow.show()
        login.hide()
    }
})

ipcMain.on('start-timelapse', () => {
    border.show()
    mainWindow.minimize()
})

ipcMain.on('stop-timelapse', () => {
    border.hide()
    mainWindow.restore()
})

ipcMain.on('logout', ()=> {
    app.relaunch()
    app.exit();
})

ipcMain.on('quit-button-pressed', () => {
    app.exit(0)
})