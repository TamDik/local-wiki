import {BrowserWindow, app, screen, ipcMain} from 'electron'
import {WikiLink, WikiType} from './wikilink';

let mainWindow: BrowserWindow|null = null;
app.on('ready', () => {
    const {width, height} = screen.getPrimaryDisplay().size
    mainWindow = new BrowserWindow({
        width,
        height,
        webPreferences: {
            contextIsolation: true,
            preload: __dirname + '/preload.js',
        },
    });

    mainWindow.webContents.openDevTools();

    const indexPath: string = 'file://' + __dirname + '/../index.html';
    mainWindow.loadURL(indexPath);
    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});


ipcMain.handle('get-content-body', async (event, mode: pageMode, path: string): Promise<{title: string, html: string}> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const wikiType: WikiType = wikiLink.type;
    if (wikiType === 'page') {
    } else if (wikiType === 'file') {
    }
    const title: string = wikiLink.toPath();
    const html: string = 'body';
    return {title, html};
});
