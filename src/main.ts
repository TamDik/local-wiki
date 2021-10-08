import {BrowserWindow, app, screen} from 'electron';
import {WikiLink, WikiLocation} from './wikilink';
require('./setup');
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

    const location: WikiLocation = new WikiLocation(new WikiLink());
    const indexPath: string = 'file://' + __dirname + '/../index.html' + location.toURI();
    mainWindow.loadURL(indexPath);
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});
