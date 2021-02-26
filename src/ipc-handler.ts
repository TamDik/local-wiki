import * as fs from 'fs';
import {ipcMain, shell} from 'electron'
import {ContentGenerator, PageReadBody} from './content-generator';
import {WikiConfig} from './wikiconfig';
import {WikiHistory, VersionData} from './wikihistory';
import {WikiHistoryFactory, BufferPathGeneratorFactory} from './wikihistory-factory';
import {WikiLink} from './wikilink';
import {escapeRegex, extensionOf, generateRandomString} from './utils';


function toFullPath(filename: string, namespace: string, wikiType: WikiType): string {
    return BufferPathGeneratorFactory.create(namespace, wikiType).execute(filename);
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
ipcMain.handle('get-html-contents', async (event, mode: PageMode, path: string, version?: number): Promise<{title: string, body: string, sideMenu: string, tabs: TopNavTabData[],
                                                                                                            dependences: {css: string[], js: string[]}}> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const title: string = ContentGenerator.title(mode, wikiLink);
    const sideMenu: string = ContentGenerator.sideMenu();
    let mainContent: {body: string, dependences: {css: string[], js: string[]}};
    if (typeof(version) === 'number') {
        mainContent = ContentGenerator.mainContent(mode, wikiLink, version);
    } else {
        mainContent = ContentGenerator.mainContent(mode, wikiLink);
    }
    const tabs: TopNavTabData[] = ContentGenerator.menuTabs(mode, wikiLink);
    return {title, sideMenu, tabs, ...mainContent};
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
    if (!config.hasNamespace(wikiLink.namespace)) {
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
ipcMain.handle('upload-file', async (event, path: string, destName: string, sourcePath: string, comment: string): Promise<boolean> => {
    const namespace: string = new WikiLink(path).namespace;
    const wikiType: WikiType = 'File';
    const fileLink: WikiLink = new WikiLink({namespace, name: destName, type: wikiType});
    const history: WikiHistory = WikiHistoryFactory.create(namespace, wikiType);
    const filename: string = generateRandomString(16) + '.' + extensionOf(sourcePath);
    const filepath: string = toFullPath(filename, namespace, wikiType);
    fs.copyFileSync(sourcePath, filepath);
    history.add({name: fileLink.name, comment, filename});
    return true;
});

// マークダウンをHTMLに変換
ipcMain.handle('markdown-to-html', async (event, markdown: string): Promise<string> => {
    return PageReadBody.markdownToHtml(markdown);
});

// キーワードでページを検索
ipcMain.on('search-page-by-keyword', (event, path: string, keywords: string[]) => {
    const namespace: string = new WikiLink(path).namespace;
    const wikiType: WikiType = 'Page';
    const history: WikiHistory = WikiHistoryFactory.create(namespace, wikiType);
    const currentData: VersionData[] = history.getCurrentList();
    if (keywords.length === 0) {
        return;
    }

    for (const data of currentData) {
        const filepath: string = toFullPath(data.filename, namespace, wikiType);
        const text: string = fs.readFileSync(filepath, 'utf-8');
        const lowerText: string = text.toLowerCase();
        let matched: boolean = true;
        for (const keyword of keywords) {
            if (!lowerText.includes(keyword.toLowerCase())) {
                matched = false;
                continue;
            }
        }
        if (matched) {
            const pageLink: WikiLink = new WikiLink({namespace, name: data.name, type: wikiType});
            event.sender.send('search-page-result', pageLink, text, data.created, keywords);
        }
    }
});

// 名前でページを検索
ipcMain.handle('search-page-by-name', async (event, path: string, name: string): Promise<{exists: boolean, wikiLink: IWikiLink}> => {
    const namespace: string = new WikiLink(path).namespace;
    const wikiType: WikiType = 'Page';
    const history: WikiHistory = WikiHistoryFactory.create(namespace, wikiType);
    const wikiLink: IWikiLink = new WikiLink({namespace, name, type: wikiType});
    const exists: boolean = history.hasName(name);
    return {exists, wikiLink};
});

// サイドメニューのデータを返す
ipcMain.handle('get-side-menu-data', async (event): Promise<{main: SideMenuSectionData, sub: {title: string, data: SideMenuSectionData}[]}> => {
    const config: WikiConfig = new WikiConfig();
    return config.getSideMenu();
});

// サイドメニューをアップデートする
ipcMain.handle('update-side-menu', async(event, main: SideMenuSectionData, sub: {title: string, data: SideMenuSectionData}[]): Promise<boolean> => {
    const config: WikiConfig = new WikiConfig();
    config.setSideMenu({main, sub});
    return true;
});

// 名前空間の存在確認
ipcMain.handle('exists-namespace', async (event, namespace: string): Promise<boolean> => {
    const config: WikiConfig = new WikiConfig();
    return config.hasNamespace(namespace);
});

ipcMain.handle('used-as-an-external-namespace', async (event, rootDir: string): Promise<boolean> => {
    return WikiConfig.usedAsAnExternalNamespace(rootDir);
});

// 名前空間の作成
ipcMain.handle('create-internal-namespace', async (event, name: string): Promise<boolean> => {
    const config: WikiConfig = new WikiConfig();
    config.newNamespace(name, 'internal');
    return true;
});

ipcMain.handle('create-external-namespace', async (event, name: string, rootDir: string): Promise<boolean> => {
    const config: WikiConfig = new WikiConfig();
    config.newNamespace(name, 'external', rootDir);
    return true;
});

// 名前空間の復元
ipcMain.handle('revert-external-namespace', async (event, rootDir: string): Promise<boolean> => {
    const config: WikiConfig = new WikiConfig();
    config.revertExternalNamespace(rootDir);
    return true;
});
