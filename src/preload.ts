import {contextBridge, ipcRenderer, remote} from "electron";
import * as utils from './utils';
import {WikiLink, WikiLocation} from './wikilink';
import {fileTypeOf, supportedImage, supportedPDF} from './wikifile';


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
        getSupportedFileExtensions: (): string[] => {
            return [...supportedImage, ...supportedPDF];
        },
        fileTypeOf: (filename: string): FileType => {
            return fileTypeOf(filename);
        },
        parsePath: (path: string): IWikiLink => {
            const wikiLink: WikiLink = new WikiLink(path);
            return {namespace: wikiLink.namespace, type: wikiLink.type, name: wikiLink.name};
        },
        toPath: (path: IncompleteWikiLink|string): string => {
            const wikiLink: WikiLink = new WikiLink(path);
            return wikiLink.toPath();
        },
        toFullPath: (path: IncompleteWikiLink|string): string => {
            const wikiLink: WikiLink = new WikiLink(path);
            return wikiLink.toFullPath();
        },
        parseURI: (uri: string): {wikiLink: IWikiLink, params: {[key: string]: string}} => {
            const result = WikiLocation.parseURI(uri);
            const params: {[key: string]: string} = {};
            for (const [key, value] of result.params) {
                params[key] = value;
            }
            return {wikiLink: result.wikiLink, params};
        },
        toURI: (path: IncompleteWikiLink|string, params: {[key: string]: string}={}): string => {
            const location: WikiLocation = new WikiLocation(new WikiLink(path));
            for (const key in params) {
                location.addParam(key, params[key]);
            }
            return location.toURI();
        },
    }
);


type OpenDialogReturnValue = {canceled: boolean, filePaths: string[]};
contextBridge.exposeInMainWorld(
    'dialog', {
        async openFileDialog(): Promise<OpenDialogReturnValue> {
            return remote.dialog.showOpenDialog({properties: ['openFile']});
        },
        async openDirectoryDialog(): Promise<OpenDialogReturnValue> {
            return remote.dialog.showOpenDialog({properties: ['openDirectory', 'createDirectory']});
        }
    }
);


contextBridge.exposeInMainWorld(
    'ipcApi', {
        async tex2svg(tex: string): Promise<{success: true, output: string}|{success: false, message: string}> {
            return ipcRenderer.invoke('tex-to-svg', tex);
        },
        async tex2chtml(tex: string): Promise<{success: true, output: string}|{success: false, message: string}> {
            return ipcRenderer.invoke('tex-to-chtml', tex);
        },
        async openExternalLink(path: string): Promise<void> {
            ipcRenderer.invoke('open-external-link', path);
        },
        async openInternalLink(uri: string): Promise<void> {
            ipcRenderer.invoke('open-internal-link', uri);
        },
        async existsLink(wikiLink: IWikiLink): Promise<boolean> {
            return ipcRenderer.invoke('exists-link', wikiLink);
        },
        async currentVersion(path: string): Promise<number> {
            return ipcRenderer.invoke('current-version', path);
        },
        async getMainContent(mode: PageMode, path: string, params: {[key: string]: string}, version?: number):
            Promise<{namespaceIcon: string, title: string, body: string, sideMenu: string, tabs: TopNavTabData[], dependences: {css: string[], js: string[]}}> {
            return ipcRenderer.invoke('get-html-contents', mode, path, params, version);
        },
        goBack(): void {
            ipcRenderer.send('go-back');
        },
        goForward(): void {
            ipcRenderer.send('go-forward');
        },
        reload(): void {
            ipcRenderer.send('reload');
        },
        async canGoBackOrForward(): Promise<{back: boolean, forward: boolean}> {
            return ipcRenderer.invoke('can-go-back-or-forward');
        },
        async uploadFile(path: string, name: string, filepath: string, comment: string): Promise<boolean> {
            return ipcRenderer.invoke('upload-file', path, name, filepath, comment);
        },
        async updatePage(path: string, text: string, comment: string, section?: number): Promise<boolean> {
            return ipcRenderer.invoke('update-page', path, text, comment, section);
        },
        async getRawPageText(path: string, version?: number): Promise<string> {
            return ipcRenderer.invoke('get-raw-page-text', path, version);
        },
        async markdownToHtml(path: string, markdown: string): Promise<string> {
            return ipcRenderer.invoke('markdown-to-html', path, markdown);
        },
        async likeEmojis(name: string): Promise<Set<{name: string, html: string}>> {
            return ipcRenderer.invoke('like-emoji', name);
        },
        async searchPageByName(path: string, name: string): Promise<{exists: boolean, path: string}> {
            return ipcRenderer.invoke('search-page-by-name', path, name);
        },
        searchPageByKeywords(path: string, keywords: string[]): void {
            ipcRenderer.send('search-page-by-keyword', path, keywords);
        },
        searchPageResult(lister: (path: string, body: string, created: Date, keywords: string[]) => void): void {
            ipcRenderer.on('result-of-page-search-by-keyword', (event, p: string, b: string, c: Date, k: string[]) => lister(p, b, c, k));
        },
        async getSideMenuData(): Promise<{main: SideMenuSectionData, sub: {title: string, data: SideMenuSectionData}[]}> {
            return ipcRenderer.invoke('get-side-menu-data');
        },
        async updateSideMenu(main: SideMenuSectionData, sub: {title: string, data: SideMenuSectionData}[]): Promise<boolean> {
            return ipcRenderer.invoke('update-side-menu', main, sub);
        },
        async existsNamespace(namespace: string): Promise<boolean> {
            return ipcRenderer.invoke('exists-namespace', namespace);
        },
        async usedAsAnExternalNamespace(rootDir: string): Promise<null|{name: string, iconPath: string}> {
            return ipcRenderer.invoke('used-as-an-external-namespace', rootDir)
        },
        async createInternalNamespace(name: string, base64Icon: string): Promise<boolean> {
            return ipcRenderer.invoke('create-internal-namespace', name, base64Icon);
        },
        async createExternalNamespace(name: string, base64Icon: string, rootDir: string): Promise<boolean> {
            return ipcRenderer.invoke('create-external-namespace', name, base64Icon, rootDir);
        },
        async revertExternalNamespace(rootDir: string): Promise<boolean> {
            return ipcRenderer.invoke('revert-external-namespace', rootDir);
        },
        async updateNamespace(namespaceId: string, name: string, base64Icon: string): Promise<boolean> {
            return ipcRenderer.invoke('update-namespace', namespaceId, name, base64Icon);
        },
        async retrieveChildCategories(path: string|null, baseNamespace: string): Promise<{wikiLink: IWikiLink, hasChildren: boolean}[]> {
            return ipcRenderer.invoke('retrieve-child-categories', path, baseNamespace);
        },
    }
);
