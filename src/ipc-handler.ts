import * as fs from 'fs';
import {ipcMain, shell} from 'electron'
import {ContentGenerator, PageReadBody} from './content-generator';
import {WikiConfig} from './wikiconfig';
import {WikiHistory, VersionData} from './wikihistory';
import {WikiHistoryFactory, BufferPathGeneratorFactory} from './wikihistory-factory';
import {WikiLink} from './wikilink';
import {generateRandomString} from './util';


function toFullPath(filename: string, namespace: string, wikiType: WikiType): string {
    return BufferPathGeneratorFactory.create(namespace, wikiType).execute(filename);
}

function extensionOf(filename: string): string {
    return filename.replace(/^.*\./, '');
}

ipcMain.handle('open-external-link', async (event, path: string): Promise<void> => {
    shell.openExternal(path);
});

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
ipcMain.handle('get-main-content', async (event, mode: PageMode, path: string, version?: number): Promise<{linkElement: WikiLinkElement, title: string, body: string, tabs: TabParams[]}> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const linkElement: WikiLinkElement = {namespace: wikiLink.namespace, name: wikiLink.name, type: wikiLink.type};
    const title: string = ContentGenerator.createTitle(mode, wikiLink);
    let body: string;
    if (typeof(version) === 'number') {
        body = ContentGenerator.createBody(mode, wikiLink, version);
    } else {
        body = ContentGenerator.createBody(mode, wikiLink);
    }
    const tabs: TabParams[] = ContentGenerator.createMenuTabs(mode, wikiLink);
    return {linkElement, title, body, tabs};
});

// 生のPageデータを返す
ipcMain.handle('get-raw-page-text', async (event, path: string, version?: number): Promise<string> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const history: WikiHistory = WikiHistoryFactory.create(wikiLink.namespace, wikiLink.type);
    if (!history.hasName(wikiLink.name)) {
        return '';
    }
    let data: VersionData;
    if (typeof(version) === 'number') {
        data = history.getByVersion(wikiLink.name, version);
    } else {
        data = history.getByName(wikiLink.name);
    }
    const filepath: string = toFullPath(data.filename, wikiLink.namespace, wikiLink.type);
    return fs.readFileSync(filepath, 'utf-8'); 
});

// 最新バージョンの取得
ipcMain.handle('current-version', async (event, path: string): Promise<number> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const history: WikiHistory = WikiHistoryFactory.create(wikiLink.namespace, wikiLink.type);
    return history.getByName(wikiLink.name).version;
});

// 存在確認
ipcMain.handle('exists-path', async (event, path: string, version?: number): Promise<boolean> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const config: WikiConfig = new WikiConfig();
    if (!config.hasNameSpace(wikiLink.namespace)) {
        return false;
    }
    const history: WikiHistory = WikiHistoryFactory.create(wikiLink.namespace, wikiLink.type);
    if (!history.hasName(wikiLink.name)) {
        return false;
    }
    if (!version) {
        return true;
    }
    const current: VersionData = history.getByName(wikiLink.name);
    return version > 0 && version <= current.version;
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

// マークダウンをHTMLに変換
ipcMain.handle('markdown-to-html', async (event, markdown: string): Promise<string> => {
    return PageReadBody.markdownToHtml(markdown);
});
