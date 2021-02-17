import {contextBridge, ipcRenderer, remote} from "electron";
import * as utils from './utils';


contextBridge.exposeInMainWorld(
    'utils', {
        trim: (s: string): string => utils.trim(s),
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
        async getMainContent(mode: PageMode, path: string, version?: number): Promise<{linkElement: WikiLinkElement, title: string, body: string}> {
            return ipcRenderer.invoke('get-main-content', mode, path, version);
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
        async uploadFile(path: string, name: string, filepath: string, comment: string): Promise<string> {
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
        }
    }
);
