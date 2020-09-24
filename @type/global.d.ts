export declare global {
    interface Window {
        ipcRenderer: IpcRendererApi;
        hljs: any;
        marked: any;
    }
}

type Listener = (event: any, ...arg: any[]) => void;
interface IpcRendererApi {
    send: (change: string, ...arg: any[]) => void;
    sendSync: <T>(change: string, ...arg: any[]) => T;
    on: (change: string, listener: Listener) => void;
    async invoke: <T>(change: string, ...arg: any[]) => Promise<T>;
}
