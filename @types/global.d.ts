export declare global {
    type WikiType = 'Page'|'File'|'Special';

    type PageMode = 'read'|'edit'|'history';

    type WikiLinkElement = {namespace: string, name: string, type: WikiType};

    interface Window {
        ipcRenderer: IIpcRenderer;
        dialog: Dialog;
        localWiki: ILocalWiki;
    }
}


interface IIpcRenderer {
    send: (change: string, ...arg: any[]) => void;
    sendSync: <T>(change: string, ...arg: any[]) => T;
    on: (change: string, listener: Listener) => void;
    async invoke: <T>(change: string, ...arg: any[]) => Promise<T>;
}


interface ILocalWiki {
    isMode: (arg: any) => arg is PageMode;
}
