import {contextBridge, ipcRenderer, remote} from "electron";
import * as utils from './utils';
import {WikiLink, WikiLocation} from './wikilink';


contextBridge.exposeInMainWorld(
    'utils', utils
);


type IncompleteWikiLink = {namespace?: string, type?: WikiType, name?: string};
contextBridge.exposeInMainWorld(
    'localWiki', {
        isMode: (arg: any): arg is PageMode => {
            if (typeof(arg) !== 'string') {
                return false
            }
            return ['read', 'edit', 'history'].includes(arg);
        },
        toPath: (path: IncompleteWikiLink|string): string => {
            const wikiLink: WikiLink = new WikiLink(path);
            return wikiLink.toPath();
        },
        toURI: (path: IncompleteWikiLink|string, params: {[key: string]: string}={}): string => {
            const location: WikiLocation = new WikiLocation(new WikiLink(path));
            for (const key in params) {
                location.addParam(key, params[key]);
            }
            return location.toURI();
        }
    }
);


type DialogResult = {canceled: boolean, filePaths: string[]};
contextBridge.exposeInMainWorld(
    'dialog', {
        async openFileDialog(): Promise<{canceled: boolean, filePaths: string[]}> {
            return remote.dialog.showOpenDialog({properties: ['openFile']});
        }
    }
);



contextBridge.exposeInMainWorld(
    'ipcApi', {
        async openExternalLink(path: string): Promise<void> {
            ipcRenderer.invoke('open-external-link', path);
        },
        async existsPath(path: string): Promise<boolean> {
            return ipcRenderer.invoke('exists-path', path);
        },
        async currentVersion(path: string): Promise<number> {
            return ipcRenderer.invoke('current-version', path);
        },
        async getMainContent(mode: PageMode, path: string, version?: number): Promise<{title: string, body: string, sideMenu: string, tabs: TopNavTabData[],
                                                                                       dependences: {css: string[], js: string[]}}> {
            return ipcRenderer.invoke('get-html-contents', mode, path, version);
        },
        goBack(): void {
            ipcRenderer.send('go-back');
        },
        goForward(): void {
            ipcRenderer.send('go-forward');
        },
        async canGoBackOrForward(): Promise<{back: boolean, forward: boolean}> {
            return ipcRenderer.invoke('can-go-back-or-forward');
        },
        async uploadFile(path: string, name: string, filepath: string, comment: string): Promise<boolean> {
            return ipcRenderer.invoke('upload-file', path, name, filepath, comment);
        },
        async updatePage(path: string, text: string, comment: string): Promise<boolean> {
            return ipcRenderer.invoke('update-page', path, text, comment);
        },
        async getRawPageText(path: string, version?: number): Promise<string> {
            return ipcRenderer.invoke('get-raw-page-text', path, version);
        },
        async markdownToHtml(markdown: string): Promise<string> {
            return ipcRenderer.invoke('markdown-to-html', markdown);
        },
        searchPageByKeywords(path: string, keywords: string[]): void {
            ipcRenderer.send('search-page-by-keyword', path, keywords);
        },
        async searchPageByName(path: string, name: string): Promise<{exists: boolean, path: string}> {
            return ipcRenderer.invoke('search-page-by-name', path, name);
        },
        searchPageResult(lister: (path: string, body: string, created: Date, keywords: string[]) => void): void {
            ipcRenderer.on('search-page-result', (event, p: string, b: string, c: Date, k: string[]) => lister(p, b, c, k));
        },
        async getSideMenuData(): Promise<{main: SideMenuSectionData, sub: {title: string, data: SideMenuSectionData}[]}> {
            return ipcRenderer.invoke('get-side-menu-data');
        },
        async updateSideMenu(main: SideMenuSectionData, sub: {title: string, data: SideMenuSectionData}[]): Promise<boolean> {
            return ipcRenderer.invoke('update-side-menu', main, sub);
        },
    }
);
