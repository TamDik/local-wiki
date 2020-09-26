import {app, BrowserWindow, screen, ipcMain} from 'electron';
import {EditableType} from './model/wiki_constant';
import {Wiki, IEditableContent} from './model/wiki';

const wiki: Wiki = new Wiki();

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


ipcMain.handle('create-wikins', async (event, wikiNS: string, dataDir: string): Promise<boolean> => {
    if (wiki.hasNS(wikiNS)) {
        return false;
    }
    wiki.createNS(wikiNS, dataDir);
    return true;
});

ipcMain.handle('exists-content', async (event, wikiNS: string, wikiType: EditableType, wikiName: string): Promise<boolean> => {
    return wiki.hasContent(wikiNS, wikiType, wikiName);
});

ipcMain.handle('get-content', async (event, wikiNS: string, wikiType: EditableType, wikiName: string): Promise<string|null> => {
    if (!wiki.hasContent(wikiNS, wikiType, wikiName)) {
        return null;
    }
    return wiki.getContent(wikiNS, wikiType, wikiName);
});

ipcMain.handle('update-content', async (event, wikiNS: string, wikiType: EditableType, wikiName: string,
                                        content: string, comment: string): Promise<boolean> => {
    if (wiki.hasContent(wikiNS, wikiType, wikiName)) {
        wiki.createEditableContent(wikiNS, wikiType, wikiName, content, comment);
    } else {
        wiki.updateEditableContent(wikiNS, wikiType, wikiName, content, comment);
    }
    return true;
});

ipcMain.handle('revert-content', async (event, wikiNS: string, wikiType: EditableType, wikiName: string,
                                        version: number, comment: string): Promise<boolean> => {
    if (!wiki.hasContent(wikiNS, wikiType, wikiName)) {
        return false;
    }
    wiki.revertEditableContent(wikiNS, wikiType, wikiName, version, comment);
    return true;
});
