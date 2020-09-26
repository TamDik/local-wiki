// レンダラプロセスのメインプロセスに対する通信を中継する。
// プロセス間通信を集約してメインプロセスとレンダラプロセスの間の関係を疎にする。

class IpcAdapter {
    // wikiNS
    public static async createNS(wikiNS: string, dataDir: string): Promise<boolean> {
        return window.ipcRenderer.invoke<boolean>('create-wikins', wikiNS, dataDir)
    }

    public static async existsContent(wikiNS: string, wikiType: WikiType, wikiName: string): Promise<boolean> {
        return IpcAdapter.exists({wikiNS, wikiName, wikiType});
    }

    // Main Page
    public static async getPageText(wikiNS: string, wikiName: string): Promise<string|null> {
        return IpcAdapter.getContent({wikiNS, wikiName, wikiType: 'Main'});
    }

    public static async editPage(wikiNS: string, wikiName: string, text: string, comment: string): Promise<boolean> {
        return IpcAdapter.update({wikiNS, wikiName, wikiType: 'Main'}, text, comment);
    }

    public static async revertPage(wikiNS: string, wikiName: string, version: number, comment: string): Promise<boolean> {
        return IpcAdapter.revert({wikiNS, wikiName, wikiType: 'Main'}, version, comment);
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

    public static async getFilepath(wikiNS: string, wikiName: string): Promise<string|null> {
        return IpcAdapter.getContent({wikiNS, wikiName, wikiType: 'File'});
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

    private static async getContent(wikiLocation: WikiLocation): Promise<string | null> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<string | null>('get-content', wikiNS, wikiType, wikiName)
    }

    private static async update(wikiLocation: WikiLocation, content: string, comment: string): Promise<boolean> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<boolean>('update-content', wikiNS, wikiType, wikiName, content, comment)
    }

    private static async revert(wikiLocation: WikiLocation, version: number, comment: string): Promise<boolean> {
        const {wikiNS, wikiType, wikiName} = wikiLocation;
        return window.ipcRenderer.invoke<boolean>('revert-content', wikiNS, wikiType, wikiName, version, comment)
    }
}
