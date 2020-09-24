declare global {
    interface Window {
        ipcRenderer: IpcRendererApi;
        dialog: Dialog;
        hljs: hljs;
        marked: marked;
        difflib: any;
    }

}

type Listener = (event: any, ...arg: any[]) => void;
export interface IpcRendererApi {
    send: (change: string, ...arg: any[]) => void;
    sendSync: <T>(change: string, ...arg: any[]) => T;
    on: (change: string, listener: Listener) => void;
    async invoke: <T>(change: string, ...arg: any[]) => Promise<T>;
}
