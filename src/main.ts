import {app, BrowserWindow, screen, ipcMain} from 'electron';
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

ipcMain.handle('get-content', async (event, wikiNS: string, wikiType: EditableType, wikiName: string,
                                     version: number): Promise<string|null> => {
    if (!wiki.hasContent(wikiNS, wikiType, wikiName)) {
        return null;
    }
    return wiki.getContent(wikiNS, wikiType, wikiName, version);
});

ipcMain.handle('update-content', async (event, wikiNS: string, wikiType: EditableType, wikiName: string,
                                        content: string, comment: string): Promise<boolean> => {
    if (wiki.hasContent(wikiNS, wikiType, wikiName)) {
        wiki.updateEditableContent(wikiNS, wikiType, wikiName, content, comment);
    } else {
        wiki.createEditableContent(wikiNS, wikiType, wikiName, content, comment);
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

ipcMain.handle('get-historical-data', async (event, wikiNS: string, wikiType: EditableType, wikiName: string,
                                             len: number, maxVersion: number=0): Promise<HistoricalData[]> => {
    const range: null|[number, number] = historyRange(wikiNS, wikiType, wikiName, len, maxVersion);
    if (range === null) {
        return [];
    }

    const historicalData: HistoricalData[] = [];
    for (let version = range[1]; version >= range[0]; version--) {
        const data: HistoricalData = wiki.getHistoricalData(wikiNS, wikiType, wikiName, version);
        historicalData.push(data);
    }
    return historicalData;
})

ipcMain.handle('get-historical-text-data', async (event, wikiNS: string, wikiType: EditableTextType, wikiName: string,
                                                  len: number, maxVersion: number=0): Promise<HistoricalData[]> => {
    const range: null|[number, number] = historyRange(wikiNS, wikiType, wikiName, len, maxVersion);
    if (range === null) {
        return [];
    }

    const historicalData: HistoricalTextData[] = [];
    for (let version = range[1]; version >= range[0]; version--) {
        const data: HistoricalTextData = wiki.getHistoricalTextData(wikiNS, wikiType, wikiName, version);
        historicalData.push(data);
    }
    return historicalData;
});

ipcMain.handle('get-historical-file-data', async (event, wikiNS: string, wikiType: EditableFileType, wikiName: string,
                                                  len: number, maxVersion: number): Promise<HistoricalFileData[]> => {
    const range: null|[number, number] = historyRange(wikiNS, wikiType, wikiName, len, maxVersion);
    if (range === null) {
        return [];
    }

    const historicalData: HistoricalFileData[] = [];
    for (let version = range[1]; version >= range[0]; version--) {
        const data: HistoricalFileData = wiki.getHistoricalFileData(wikiNS, wikiType, wikiName, version);
        historicalData.push(data);
    }
    return historicalData;
});

function historyRange(wikiNS: string, wikiType: EditableType, wikiName: string,
                      len: number, maxVersion: number): null|[number, number] {
    if (!wiki.hasContent(wikiNS, wikiType, wikiName)) {
        return null;
    }
    const latestVersion: number = wiki.latestEditableContentVersion(wikiNS, wikiType, wikiName);
    if (maxVersion < 0) {
        return null;
    }
    if (maxVersion === 0) {
        maxVersion = latestVersion;
    }
    maxVersion = Math.min(maxVersion, latestVersion);
    const minVersion: number = Math.max(1, maxVersion - len + 1);
    return [minVersion, maxVersion];
}
