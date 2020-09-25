import {app, BrowserWindow, screen, ipcMain} from 'electron';
import {EditableType} from './model/wiki_constant';
import {Wiki} from './model/wiki';

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


// event.returnValue を設定し忘れるとレンダラプロセスが停止してしまうので、ipcRenderer.sendSync に対する
// コールバックはこの関数を通して利用する。
// 型宣言された listener の返戻値が event.returnValue に渡されるので型の面でも安全。
function safeSyncIpcMainOn<S, T>(change: string, listener: (params: S) => T): void {
    ipcMain.on(change, (event, params: S) => {
        event.returnValue = listener(params);
    });
};

/* safeSyncIpcMainOn<[string, EditableType, string], string|null>('get-content', ([wikiNS, wikiType, wikiName]) => { */
/* }); */

ipcMain.handle('exists-content', async (event, wikiNS: string, wikiType: EditableType, wikiName: string): Promise<boolean> => {
    return wiki.hasContent(wikiNS, wikiType, wikiName);
});

ipcMain.handle('get-content', async (event, wikiNS: string, wikiType: EditableType, wikiName: string): Promise<string|null> => {
    if (!wiki.hasContent(wikiNS, wikiType, wikiName)) {
        return null;
    }
    switch (wikiType) {
        case 'Main':
            return wiki.getPage(wikiNS, wikiName).content;
        case 'Template':
            return wiki.getTemplate(wikiNS, wikiName).content;
        case 'File':
            return wiki.getFile(wikiNS, wikiName).content;
    }
});
