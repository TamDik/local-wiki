import {contextBridge, ipcRenderer, remote} from "electron";
import marked from 'marked';
import hljs from 'highlight.js';

contextBridge.exposeInMainWorld(
    'marked', {
        setOptions: (options: marked.MarkedOptions): void => {
            marked.setOptions(options);
        },
        createRenderer: (): marked.Renderer => {
            return new marked.Renderer();
        },
        use: (options: marked.MarkedOptions): void => {
            marked.use(options);
        },
        marked: (markdown: string): string => {
            return marked(markdown);
        }
    }
);

contextBridge.exposeInMainWorld(
    'hljs', {
        getLanguage: (language: string): Language | undefined => {
            return hljs.getLanguage(language);
        },
        highlight: (language: string, code: string): HighlightResult => {
            return hljs.highlight(language, code);
        }
    }
);

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
    },
);

type DialogResult = {canceled: boolean, filePaths: string[]};
contextBridge.exposeInMainWorld(
    'dialog', {
        showOpenDialogSync: (options: Object): string[]|undefined => {
            return remote.dialog.showOpenDialogSync(options);
        },
        showOpenDialog: async (options: Object): Promise<DialogResult> => {
            return remote.dialog.showOpenDialog(options);
        }
    }
);
