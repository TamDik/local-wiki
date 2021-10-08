export declare global {
    type WikiType = 'Page'|'File'|'Category'|'Template'|'Special';
    type PageMode = 'read'|'edit'|'history';
    type FileType = 'pdf'|'image'|'other';
    interface IWikiLink {
        namespace: string;
        type: WikiType;
        name: string;
    };
    type TopNavTabData = {title: string, href: string, selected: boolean};
    type SideMenuContentData = {type: 'text', value: string}|{type: 'link', text: string, path: string};
    type SideMenuSectionData = SideMenuContentData[];

    interface Window {
        utils: IUtils;
        localWiki: ILocalWiki;
        dialog: IDialog;
        ipcApi: IIpcApi;
    }
}


interface IUtils {
    extensionOf(filename: string): string;
    trim(s: string): string;
    dateToStr(date: Date): string;
    escapeRegex(str: string): string;
    isNaturalNumber(str: string): boolean;
    isNonNegativeNumber(str: string): boolean;
}


interface IIpcApi {
    openExternalLink(path: string): Promise<void>;
    openInternalLink(path: string): Promise<void>;
    existsLink(wikiLink: IWikiLink): Promise<boolean>;
    currentVersion(path: string): Promise<number>;
    getMainContent(mode: PageMode, path: string, params: {[key: string]: string}, version?: number):
        Promise<{namespaceIcon: string, title: string, body: string, sideMenu: string, tabs: TopNavTabData[], dependences: {css: string[], js: string[]}}>;
    goBack(): void;
    goForward(): void;
    reload(): void;
    canGoBackOrForward(): Promise<{back: boolean, forward: boolean}>;
    uploadFile(path: string, name: string, filepath: string, comment: string): Promise<boolean>;
    updatePage(path: string, text: string, comment: string, section?: number): Promise<boolean>;
    getRawPageText(path: string, version?: number): Promise<string>;
    markdownToHtml(path: string, markdown: string): Promise<string>;
    likeEmojis(name: string): Promise<Set<{name: string, html: string}>>;
    searchPageByKeywords(path: string, keywords: string[]): void;
    searchPageByName(path: string, name: string): Promise<{exists: boolean, wikiLink: IWikiLink}>;
    searchPageResult(lister: (wikiLink: IWikiLink, body: string, created: Date, keywords: string[]) => void): void;
    getSideMenuData(): Promise<{main: SideMenuSectionData, sub: {title: string, data: SideMenuSectionData}[]}>;
    updateSideMenu(main: SideMenuSectionData, sub: {title: string, data: SideMenuSectionData}[]): Promise<boolean>;
    existsNamespace(namespace: string): Promise<boolean>;
    usedAsAnExternalNamespace(rootDir: string): Promise<null|{name: string, iconPath: string}>;
    createInternalNamespace(name: string, base64Icon: string): Promise<boolean>;
    createExternalNamespace(name: string, base64Icon: string, rootDir: string): Promise<boolean>;
    revertExternalNamespace(rootDir: string): Promise<boolean>;
    updateNamespace(namespaceId: string, name: string, base64Icon: string): Promise<boolean>;
    retrieveChildCategories(path: string|null, baseNamespace: string): Promise<{wikiLink: IWikiLink, hasChildren: boolean}[]>;
    tex2svg(tex: string): Promise<{success: true, output: string}|{success: false, message: string}>;
    tex2chtml(tex: string): Promise<{success: true, output: string}|{success: false, message: string}>;
}


type OpenDialogReturnValue = {canceled: boolean, filePaths: string[]};
interface IDialog {
    openFileDialog(): Promise<OpenDialogReturnValue>;
    openDirectoryDialog(): Promise<OpenDialogReturnValue>;
}


type IncompleteWikiLink = {namespace?: string, type?: WikiType, name?: string};
interface ILocalWiki {
    isMode: (arg: any) => arg is PageMode;
    getSupportedFileExtensions: () => string[];
    fileTypeOf: (filename: string) => FileType;
    parsePath: (path: string) => IWikiLink;
    toPath: (path: IncompleteWikiLink|string) => string;
    toFullPath: (path: IncompleteWikiLink|string) => string;
    parseURI: (uri: string) => {wikiLink: IWikiLink, params: {[key: string]: string}};
    toURI: (path: IncompleteWikiLink|string, params: {[key: string]: string}={}) => string;
}
