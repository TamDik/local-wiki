import {app, BrowserWindow, screen, ipcMain} from 'electron';
import {Wiki} from './model/wiki';


let mainWindow: BrowserWindow | null = null;
app.on('ready', () => {
    const {width, height} = screen.getPrimaryDisplay().size
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        // fullscreen: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: true,
            preload: __dirname + '/preload.js'
        }
    });

    const index: string = `file://${__dirname}/../index.html`;
    mainWindow.loadURL(index);
    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});
