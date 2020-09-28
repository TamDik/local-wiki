export declare global {
    interface Window {
        ipcRenderer: IpcRendererApi;
        hljs: any;
        marked: any;
        difflib: any;
    }

    interface HistoricalData {
        id: string;
        name: string;
        version: number;
        next: string|null;
        prev: string|null;
        updated: string;
        comment: string;
        filename: string;
        filepath: string;
    }

    interface HistoricalTextData extends HistoricalData {
        text: string;
    };

    interface HistoricalFileData extends HistoricalData {
        filesize: number;
        filetype: FileType;
    };

    type EditableTextType = 'Main' | 'Template';
    type EditableFileType = 'File';
    type EditableType = EditableTextType | EditableFileType;
    type WikiType = EditableType | 'Special';
    type FileType = 'image' | 'pdf' | 'page' | 'other';
    type WikiAction = 'view' | 'edit' | 'history';/* | 'revert' | 'raw' | 'delete' */
}

type Listener = (event: any, ...arg: any[]) => void;
interface IpcRendererApi {
    send: (change: string, ...arg: any[]) => void;
    sendSync: <T>(change: string, ...arg: any[]) => T;
    on: (change: string, listener: Listener) => void;
    async invoke: <T>(change: string, ...arg: any[]) => Promise<T>;
}
