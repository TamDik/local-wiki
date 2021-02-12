import {BrowserWindow, app, screen} from 'electron'
require('./ipc-handler');


let mainWindow: BrowserWindow|null = null;
app.on('ready', () => {
    const {width, height} = screen.getPrimaryDisplay().size
    mainWindow = new BrowserWindow({
        width,
        height,
        webPreferences: {
            contextIsolation: true,
            enableRemoteModule: true,
            nodeIntegration: false,
            preload: __dirname + '/preload.js',
        },
    });

    const indexPath: string = 'file://' + __dirname + '/../index.html';
    mainWindow.loadURL(indexPath);
    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});
