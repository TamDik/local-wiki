import {contextBridge, ipcRenderer, remote} from "electron";


contextBridge.exposeInMainWorld(
    'ipcRenderer', {
        send: (channel: string, ...arg: any[]) => {
            ipcRenderer.send(channel, ...arg);
        },
        sendSync: (channel: string, ...arg: any[]) => {
            return ipcRenderer.sendSync(channel, ...arg);
        },
        on: (channel: string, listener: (event: any, arg: any[]) => void) => {
            ipcRenderer.on(channel, listener);
        },
        invoke: <T>(channel: string, ...arg: any[]): Promise<T> => {
            return ipcRenderer.invoke(channel, ...arg);
        }
    }
);

contextBridge.exposeInMainWorld(
    'localWiki', {
        isMode: (arg: any): arg is PageMode => {
            if (typeof(arg) !== 'string') {
                return false
            }
            return ['read', 'edit', 'history'].includes(arg);
        }
    }
);

type DialogResult = {canceled: boolean, filePaths: string[]};
contextBridge.exposeInMainWorld(
    'dialog', {
        showOpenDialog: async (options: Object): Promise<DialogResult> => {
            return remote.dialog.showOpenDialog(options);
        }
    }
);
