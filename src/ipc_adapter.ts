// レンダラプロセスのメインプロセスに対する通信を中継する。
// プロセス間通信を集約してメインプロセスとレンダラプロセスの間の関係を疎にする。

class IpcAdapter {
    public static async getNameList(wikiNS: string, wikiType: EditableType): Promise<string[]> {
        return window.ipcRenderer.invoke<string[]>('get-name-list', wikiNS, wikiType);
    }

    // wikiNS
    public static async createNS(wikiNS: string, dataDir: string): Promise<boolean> {
        return window.ipcRenderer.invoke<boolean>('create-wikins', wikiNS, dataDir)
    }

    public static async existsContent(wikiNS: string, wikiType: WikiType, wikiName: string): Promise<boolean> {
        return IpcAdapter.exists({wikiNS, wikiName, wikiType});
    }

    // Main Page
    public static async getPageText(wikiNS: string, wikiName: string, version: number=0): Promise<string|null> {
        return IpcAdapter.getContent({wikiNS, wikiName, wikiType: 'Main'}, version);
    }

    public static async editPage(wikiNS: string, wikiName: string, text: string, comment: string): Promise<boolean> {
        return IpcAdapter.update({wikiNS, wikiName, wikiType: 'Main'}, text, comment);
    }

    public static async revertPage(wikiNS: string, wikiName: string, version: number, comment: string): Promise<boolean> {
        return IpcAdapter.revert({wikiNS, wikiName, wikiType: 'Main'}, version, comment);
    }

    public static async getHistoricalPageData(wikiNS: string, wikiName: string,
                                              len: number, maxVersion: number=0): Promise<HistoricalData[]> {
        return IpcAdapter.historicalData({wikiNS, wikiName, wikiType: 'Main'}, len, maxVersion);
    }

    // Template
    public static async editTemplate(wikiNS: string, wikiName: string, text: string, comment: string): Promise<boolean> {
        return IpcAdapter.update({wikiNS, wikiName, wikiType: 'Template'}, text, comment);
    }

    public static async revertTemplate(wikiNS: string, wikiName: string, version: number, comment: string): Promise<boolean> {
        return IpcAdapter.revert({wikiNS, wikiName, wikiType: 'Template'}, version, comment);
    }

    // File
    public static async existsFile(wikiNS: string, wikiName: string): Promise<boolean> {
        return IpcAdapter.exists({wikiNS, wikiName, wikiType: 'File'});
    }

    public static async getFilepath(wikiNS: string, wikiName: string, version: number=0): Promise<string|null> {
        return IpcAdapter.getContent({wikiNS, wikiName, wikiType: 'File'}, version);
    }

    public static async uploadFile(wikiNS: string, wikiName: string, source: string, comment: string): Promise<boolean> {
        return IpcAdapter.update({wikiNS, wikiName, wikiType: 'File'}, source, comment);
    }

    public static async revertFile(wikiNS: string, wikiName: string, version: number, comment: string): Promise<boolean> {
        return IpcAdapter.revert({wikiNS, wikiName, wikiType: 'File'}, version, comment);
    }


    private static async exists(wikiLocation: WikiLocation): Promise<boolean> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<boolean>('exists-content', wikiNS, wikiType, wikiName);
    }

    private static async getContent(wikiLocation: WikiLocation, version: number): Promise<string | null> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<string | null>('get-content', wikiNS, wikiType, wikiName, version)
    }

    private static async update(wikiLocation: WikiLocation, content: string, comment: string): Promise<boolean> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<boolean>('update-content', wikiNS, wikiType, wikiName, content, comment)
    }

    private static async revert(wikiLocation: WikiLocation, version: number, comment: string): Promise<boolean> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<boolean>('revert-content', wikiNS, wikiType, wikiName, version, comment)
    }

    private static async historicalData(wikiLocation: WikiLocation, len: number, maxVersion: number=0): Promise<HistoricalData[]> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<HistoricalData[]>('get-historical-data', wikiNS, wikiType, wikiName, len, maxVersion)
    }

    private static async historicalTextData(wikiLocation: WikiLocation, len: number, maxVersion: number=0): Promise<HistoricalTextData[]> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<HistoricalTextData[]>('get-historical-text-data', wikiNS, wikiType, wikiName, len, maxVersion)
    }

    private static async historicalFileData(wikiLocation: WikiLocation, len: number, maxVersion: number=0): Promise<HistoricalFileData[]> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<HistoricalFileData[]>('get-historical-file-data', wikiNS, wikiType, wikiName, len, maxVersion)
    }
}
