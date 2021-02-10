import {BrowserWindow, app, screen, ipcMain} from 'electron'
import {ContentGenerator} from './content-generator';


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


ipcMain.handle('get-main-content', async (event, mode: PageMode, path: string): Promise<{title: string, body: string}> => {
    const title: string = ContentGenerator.createTitle(mode, path);
    const body: string = ContentGenerator.createBody(mode, path);
    return {title, body};
});
