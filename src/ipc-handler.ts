import * as fs from 'fs';
import * as path from 'path';
import {ipcMain, shell} from 'electron'
import {ContentGenerator, ContentBody} from './content-generator';
import {WikiConfig, MergedNamespaceConfig, usedAsAnExternalNamespace, parseNamespaceConfig} from './wikiconfig';
import {WikiLink} from './wikilink';
import {WikiMarkdown} from './wikimarkdown';
import {escapeRegex, extensionOf, generateRandomString} from './utils';
import {extractCategories, updateCategories, Category} from './wikicategory';
import {WikiHistory, createHistory, toFullPath, VersionData} from './wikihistory-builder';


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
ipcMain.handle('get-html-contents', async (event, mode: PageMode, path: string, params: {[key: string]: string}, version?: number): Promise<{
    namespaceIcon: string, title: string, body: string, sideMenu: string, tabs: TopNavTabData[], dependences: {css: string[], js: string[]}}> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const title: string = ContentGenerator.title(mode, wikiLink);
    const sideMenu: string = ContentGenerator.sideMenu();
    let mainContent: ContentBody;
    if (typeof(version) === 'number') {
        mainContent = ContentGenerator.mainContent(mode, wikiLink, version);
    } else {
        mainContent = ContentGenerator.mainContent(mode, wikiLink);
    }
    mainContent.applyParamerters(params);
    const tabs: TopNavTabData[] = ContentGenerator.menuTabs(mode, wikiLink);

    const wikiConfig: WikiConfig = new WikiConfig();
    let namespaceIcon: string;
    if (wikiConfig.hasNamespace(wikiLink.namespace)) {
        const config: MergedNamespaceConfig = wikiConfig.getNamespaceConfig(wikiLink.namespace);
        namespaceIcon = config.iconPath;
    } else {
        namespaceIcon = MergedNamespaceConfig.notFoundIconPath;
    }
    return {namespaceIcon, title, body: mainContent.html, sideMenu, tabs, dependences: {css: mainContent.css, js: mainContent.js}};
});

// 生のPageデータを返す
ipcMain.handle('get-raw-page-text', async (event, path: string, version?: number): Promise<string> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const filepath: string|null = toFullPath(wikiLink, version, true);
    if (filepath === null) {
        return '';
    }
    return fs.readFileSync(filepath, 'utf-8');
});

// 最新バージョンの取得
ipcMain.handle('current-version', async (event, path: string): Promise<number> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const history: WikiHistory = createHistory(wikiLink.namespace, wikiLink.type, true);
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
ipcMain.handle('update-page', async (event, path: string, text: string, comment: string, section?: number): Promise<boolean> => {
    const wikiLink: WikiLink = new WikiLink(path);
    const namespace: string = wikiLink.namespace;
    const wikiType: WikiType = wikiLink.type;
    const history: WikiHistory = createHistory(wikiLink.namespace, wikiLink.type, true);
    const filename: string = generateRandomString(16) + '.md';
    let markdown: string;
    if (section === undefined) {
        markdown = text;
    } else {
        const data: VersionData = history.getByName(wikiLink.name)
        const wmd: WikiMarkdown = new WikiMarkdown(fs.readFileSync(data.filepath, 'utf-8'));
        wmd.setSection(section, text);
        markdown = wmd.getRawText();
    }
    const data: VersionData = history.add({name: wikiLink.name, comment, filename});
    fs.writeFileSync(data.filepath, markdown);
    updateCategories(wikiLink, extractCategories(namespace, markdown));
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
    const wikiMarkdown: WikiMarkdown = new WikiMarkdown(markdown);
    let {html, categories} = wikiMarkdown.parse({baseNamespace, toFullPath});
    return html;
});

// キーワードでページを検索
ipcMain.on('search-page-by-keyword', (event, path: string, keywords: string[]) => {
    const namespace: string = new WikiLink(path).namespace;
    const wikiType: WikiType = 'Page';
    const history: WikiHistory = createHistory(namespace, wikiType, true);
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
            event.sender.send('result-of-page-search-by-keyword', pageLink, text, data.created, keywords);
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

// 子カテゴリのパスを取得
ipcMain.handle('retrieve-child-categories', async (event, path: string|null, baseNamespace: string): Promise<{wikiLink: IWikiLink, hasChildren: boolean}[]> => {
    if (path === null) {
        return Category.allUnder(baseNamespace).filter(category => category.parents.length === 0).map(category => {
            const wikiLink: WikiLink = category.toWikiLink()
            return {wikiLink, hasChildren: category.children.length !== 0};
        });
    }
    return new Category(new WikiLink(path)).children.map(category => {
        const wikiLink: WikiLink = category.toWikiLink();
        return {wikiLink, hasChildren: category.children.length !== 0};
    });
});
