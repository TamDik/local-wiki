import {BrowserWindow, app, screen} from 'electron'
import {DEFAULT_NAMESPACE} from './wikilink';
import {WikiConfig} from './wikiconfig';
require('./ipc-handler');


const config: WikiConfig = new WikiConfig();
if (config.getNamespaces().length === 0) {
    config.newNamespace(DEFAULT_NAMESPACE, 'internal');
    config.setSideMenu({
        main: [
            {type: 'link', text: 'Main', path: 'Main'},
            {type: 'link', text: 'Special pages', path: 'Special:SpecialPages'},
            {type: 'link', text: 'Upload file', path: 'Special:UploadFile'},
        ],
        sub: [],
    });
}


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
