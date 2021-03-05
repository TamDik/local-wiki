import * as fs from 'fs';
import * as path from 'path';
import {ipcMain, shell} from 'electron'
import {ContentGenerator, PageReadBody} from './content-generator';
import {WikiConfig, MergedNamespaceConfig, usedAsAnExternalNamespace, parseNamespaceConfig} from './wikiconfig';
import {WikiHistory, VersionData} from './wikihistory';
import {WikiLink} from './wikilink';
import {escapeRegex, extensionOf, generateRandomString} from './utils';
import {extractCategories, updateCategories} from './wikicategory';


function createHistory(namespace: string, wikiType: WikiType): WikiHistory {
    const config: MergedNamespaceConfig = new WikiConfig().getNamespaceConfig(namespace);
    const rootDir: string = path.join(config.rootDir, wikiType);
    if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir);
    }
    return new WikiHistory(rootDir);
}

function createMarkdownHistory(namespace: string, wikiType: WikiType): WikiHistory {
    const config: MergedNamespaceConfig = new WikiConfig().getNamespaceConfig(namespace);
    let rootDir: string;
    if (wikiType === 'File') {
        rootDir = path.join(config.rootDir, 'FileDescritption');
    } else {
        rootDir = path.join(config.rootDir, wikiType);
    }
    if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir);
    }
    return new WikiHistory(rootDir);
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

ipcMain.on('reload', event => {
    event.sender.reload();
});

// htmlに展開するコンテンツを返す
ipcMain.handle('get-html-contents', async (event, mode: PageMode, path: string, version?: number): Promise<{
    namespaceIcon: string, title: string, body: string, sideMenu: string, tabs: TopNavTabData[], dependences: {css: string[], js: string[]}}> => {
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

    const wikiConfig: WikiConfig = new WikiConfig();
    let namespaceIcon: string;
    if (wikiConfig.hasNamespace(wikiLink.namespace)) {
        const config: MergedNamespaceConfig = wikiConfig.getNamespaceConfig(wikiLink.namespace);
        namespaceIcon = config.iconPath;
    } else {
        namespaceIcon = MergedNamespaceConfig.notFoundIconPath;
    }
    return {namespaceIcon, title, sideMenu, tabs, ...mainContent};
});

// 生のPageデータを返す
ipcMain.handle('get-raw-page-text', async (event, path: string, version?: number): Promise<string> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const history: WikiHistory = createMarkdownHistory(wikiLink.namespace, wikiLink.type);
    if (!history.hasName(wikiLink.name)) {
        return '';
    }
    let data: VersionData;
    if (typeof(version) === 'number') {
        data = history.getByVersion(wikiLink.name, version);
    } else {
        data = history.getByName(wikiLink.name);
    }
    return fs.readFileSync(data.filepath, 'utf-8');
});

// 最新バージョンの取得
ipcMain.handle('current-version', async (event, path: string): Promise<number> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const history: WikiHistory = createMarkdownHistory(wikiLink.namespace, wikiLink.type);
    return history.getByName(wikiLink.name).version;
});

// 存在確認
ipcMain.handle('exists-link', async (event, wikiLink: IWikiLink, version?: number): Promise<boolean> => {
    const config: WikiConfig = new WikiConfig();
    if (!config.hasNamespace(wikiLink.namespace)) {
        return false;
    }

    if (wikiLink.type === 'Special') {
        for (const special of ContentGenerator.specialContentBodies(new WikiLink(wikiLink))) {
            if (special.name === wikiLink.name) {
                return true;
            }
        }
        return false;
    }

    const history: WikiHistory = createHistory(wikiLink.namespace, wikiLink.type);
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
    const history: WikiHistory = createMarkdownHistory(wikiLink.namespace, wikiLink.type);
    const filename: string = generateRandomString(16) + '.md';
    const data: VersionData = history.add({name: wikiLink.name, comment, filename});
    fs.writeFileSync(data.filepath, text);

    updateCategories(wikiLink, extractCategories(namespace, text));
    return true;
});

// ファイルをアップロードする
ipcMain.handle('upload-file', async (event, path: string, destName: string, sourcePath: string, comment: string): Promise<boolean> => {
    const namespace: string = new WikiLink(path).namespace;
    const wikiType: WikiType = 'File';
    const fileLink: WikiLink = new WikiLink({namespace, name: destName, type: wikiType});
    const history: WikiHistory = createHistory(namespace, wikiType);
    const filename: string = generateRandomString(16) + '.' + extensionOf(sourcePath);
    const data: VersionData = history.add({name: fileLink.name, comment, filename});
    fs.copyFileSync(sourcePath, data.filepath);
    return true;
});

// マークダウンをHTMLに変換
ipcMain.handle('markdown-to-html', async (event, markdown: string, baseNamespace: string): Promise<string> => {
    return PageReadBody.markdownToHtml(markdown, baseNamespace);
});

// キーワードでページを検索
ipcMain.on('search-page-by-keyword', (event, path: string, keywords: string[]) => {
    const namespace: string = new WikiLink(path).namespace;
    const wikiType: WikiType = 'Page';
    const history: WikiHistory = createMarkdownHistory(namespace, wikiType);
    const currentData: VersionData[] = history.getCurrentList();
    if (keywords.length === 0) {
        return;
    }

    for (const data of currentData) {
        const text: string = fs.readFileSync(data.filepath, 'utf-8');
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
    const history: WikiHistory = createHistory(namespace, wikiType);
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

ipcMain.handle('used-as-an-external-namespace', async (event, rootDir: string): Promise<null|{name: string, iconPath: string}> => {
    if (!usedAsAnExternalNamespace(rootDir)) {
        return null;
    }
    try {
        return parseNamespaceConfig(rootDir);
    } catch (e) {
        return null;
    }
});

// 名前空間の作成
ipcMain.handle('create-internal-namespace', async (event, name: string, base64Icon: string): Promise<boolean> => {
    const config: WikiConfig = new WikiConfig();
    config.newNamespace(name, 'internal', base64Icon);
    return true;
});

ipcMain.handle('create-external-namespace', async (event, name: string, base64Icon: string, rootDir: string): Promise<boolean> => {
    const config: WikiConfig = new WikiConfig();
    config.newNamespace(name, 'external', base64Icon, rootDir);
    return true;
});

// 名前空間の復元
ipcMain.handle('revert-external-namespace', async (event, rootDir: string): Promise<boolean> => {
    const config: WikiConfig = new WikiConfig();
    config.revertExternalNamespace(rootDir);
    return true;
});

// 名前空間を更新
ipcMain.handle('update-namespace', async (event, id: string, name: string, base64Icon: string): Promise<boolean> => {
    const config: MergedNamespaceConfig = new WikiConfig().getNamespaceConfig(id, {id: true, name: false});
    config.name = name;
    config.updateIcon(base64Icon);
    return true;
});
