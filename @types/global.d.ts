export declare global {
    type WikiType = 'Page'|'File'|'Special';

    type PageMode = 'read'|'edit'|'history';

    type WikiLinkElement = {namespace: string, name: string, type: WikiType};

    interface Window {
        ipcApi: IIpcApi;
        dialog: IDialog;
        localWiki: ILocalWiki;
    }
}


interface IIpcApi {
    existsPath(path: string): Promise<boolean>;
    currentVersion(path: string): Promise<number>;
    getMainContent(mode: PageMode, path: string, version?: number): Promise<{linkElement: WikiLinkElement, title: string, body: string}>;
    goBack(): void;
    goForward(): void;
    canGoBackOrForward(): Promise<{back: boolean, forward: boolean}>;
    uploadFile(path: string, name: string, filepath: string, comment: string): Promise<string>;
    updatePage(path: string, text: string, comment: string): Promise<boolean>;
    getRawPageText(path: string, version?: number): Promise<string>;
    markdownToHtml(markdown: string): Promise<string>;
}


interface IDialog {
    openFileDialog(): Promise<{canceled: boolean, filePaths: string[]}>;
}


interface ILocalWiki {
    isMode: (arg: any) => arg is PageMode;
}
