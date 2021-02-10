export declare global {
    type WikiType = 'page'|'file';

    type PageMode = 'read'|'edit'|'history';

    interface Window {
        ipcRenderer: IIpcRenderer;
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
