import * as fs from 'fs';
import {ipcMain} from 'electron'
import {ContentGenerator} from './content-generator';
import {WikiHistory} from './wikihistory';
import {WikiHistoryFactory, BufferPathGeneratorFactory} from './wikihistory-factory';
import {WikiLink} from './wikilink';
import {generateRandomString} from './util';


function toFullPath(filename: string, namespace: string, wikiType: WikiType): string {
    return BufferPathGeneratorFactory.create(namespace, wikiType).execute(filename);
}

function extensionOf(filename: string): string {
    return filename.replace(/^.*\./, '');
}


ipcMain.handle('can-go-back-or-forward', async (event): Promise<{back: boolean, forward: boolean}> => {
    const back: boolean = event.sender.canGoBack();
    const forward: boolean = event.sender.canGoForward();
    return {back, forward};
});

ipcMain.on('go-back', event => {
    event.sender.goBack();
});

ipcMain.on('go-forward', event => {
    event.sender.goForward();
});

// htmlに展開するコンテンツを返す
ipcMain.handle('get-main-content', async (event, mode: PageMode, path: string): Promise<{linkElement: WikiLinkElement, title: string, body: string}> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const linkElement: WikiLinkElement = {namespace: wikiLink.namespace, name: wikiLink.name, type: wikiLink.type};
    const title: string = ContentGenerator.createTitle(mode, wikiLink);
    const body: string = ContentGenerator.createBody(mode, wikiLink);
    return {linkElement, title, body};
});

// 生のPageデータを返す
ipcMain.handle('get-raw-page-text', async (event, path: string): Promise<string> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const history: WikiHistory = WikiHistoryFactory.create(wikiLink.namespace, wikiLink.type);
    if (history.hasName(wikiLink.name)) {
        const {filename} = history.getByName(wikiLink.name);
        const filepath: string = toFullPath(filename, wikiLink.namespace, wikiLink.type);
        return fs.readFileSync(filepath, 'utf-8'); 
    } else {
        return '';
    }
});

// Pageをアップデートする
ipcMain.handle('update-page', async (event, path: string, text: string, comment: string): Promise<boolean> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const namespace: string = wikiLink.namespace;
    const wikiType: WikiType = wikiLink.type;
    const history: WikiHistory = WikiHistoryFactory.create(namespace, wikiType);
    const filename: string = generateRandomString(16) + '.md';
    const filepath: string = toFullPath(filename, namespace, wikiType);
    fs.writeFileSync(filepath, text);
    history.add({name: wikiLink.name, comment, filename});
    return true;
});

// ファイルをアップロードする
ipcMain.handle('upload-file', async (event, path: string, destName: string, sourcePath: string, comment: string): Promise<string> => {
    const namespace: string = new WikiLink(path).namespace;
    const wikiType: WikiType = 'File';
    const fileLink: WikiLink = new WikiLink({namespace, name: destName, type: wikiType});
    const history: WikiHistory = WikiHistoryFactory.create(namespace, wikiType);
    const filename: string = generateRandomString(16) + '.' + extensionOf(sourcePath);
    const filepath: string = toFullPath(filename, namespace, wikiType);
    fs.copyFileSync(sourcePath, filepath);
    history.add({name: fileLink.name, comment, filename});
    return fileLink.toPath();
});
