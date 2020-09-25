import {EditableType, EditableTextType, EditableFileType} from './wiki_constant';
import {WikiNSManager} from './wiki_location';
import {HistoricalData, TextData, FileData, WikiHistory, TextWikiHistory, FileWikiHistory} from './wiki_history';


// Wiki の内部データに対する操作を管理する。このクラスのメソッドと、生成した WikiContent クラスに対する操作手順を記録して、
// 再実行すれば全く同じ内部状態にすることができる。
class Wiki {
    public hasContent(wikiNS: string, wikiType: EditableType, wikiName: string): boolean {
        if (!this.hasNS(wikiNS)) {
            return false;
        }
        switch (wikiType) {
            case 'Main':
                return this.hasPage(wikiNS, wikiName);
            case 'Template':
                return this.hasTemplate(wikiNS, wikiName);
            case 'File':
                return this.hasFile(wikiNS, wikiName);
        }
    }

    // WikiNS
    public hasNS(wikiNS: string): boolean {
        const nsmanager: WikiNSManager = new WikiNSManager();
        return nsmanager.has(wikiNS);
    }

    public createNS(wikiNS: string, dataDir: string): void {
        const nsmanager: WikiNSManager = new WikiNSManager();
        nsmanager.add(wikiNS, dataDir);
    }

    public getNSList(): string[] {
        const nsmanager: WikiNSManager = new WikiNSManager();
        return nsmanager.getList();
    }


    // Page
    public hasPage(wikiNS: string, wikiName: string): boolean {
        const wikiHistory: TextWikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, 'Main');
        return this.existsCheck(wikiHistory, wikiName);
    }

    public createPage(wikiNS: string, wikiName: string, body: string, comment: string): EditableTextContent {
        return EditableTextContent.create(wikiNS, 'Main', wikiName, body, comment);
    }

    public getPage(wikiNS: string, wikiName: string, version=0): EditableTextContent {
        return new EditableTextContent(wikiNS, 'Main', wikiName, version);
    }

    public getPageList(wikiNS: string): string[] {
        const wikiHistory: TextWikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, 'Main');
        return this.getNameList(wikiHistory);
    }


    // Template
    public hasTemplate(wikiNS: string, wikiName: string): boolean {
        const wikiHistory: TextWikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, 'Template');
        return this.existsCheck(wikiHistory, wikiName);
    }

    public createTemplate(wikiNS: string, wikiName: string, body: string, comment: string): EditableTextContent {
        return EditableTextContent.create(wikiNS, 'Template', wikiName, body, comment);
    }

    public getTemplate(wikiNS: string, wikiName: string, version=0): EditableTextContent {
        return new EditableTextContent(wikiNS, 'Template', wikiName, version);
    }

    public getTemplateList(wikiNS: string): string[] {
        const wikiHistory: TextWikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, 'Template');
        return this.getNameList(wikiHistory);
    }


    // File
    public hasFile(wikiNS: string, wikiName: string): boolean {
        const wikiHistory: FileWikiHistory = WikiHistoryFactory.createFileHistory(wikiNS, 'File');
        return this.existsCheck(wikiHistory, wikiName);
    }

    public createFile(wikiNS: string, wikiName: string, body: string, comment: string): EditableFileContent {
        return EditableFileContent.create(wikiNS, 'File', wikiName, body, comment);
    }

    public getFile(wikiNS: string, wikiName: string, version=0): EditableFileContent {
        return new EditableFileContent(wikiNS, 'File', wikiName, version);
    }

    public getFileList(wikiNS: string): string[] {
        const wikiHistory: FileWikiHistory = WikiHistoryFactory.createFileHistory(wikiNS, 'File');
        return this.getNameList(wikiHistory);
    }


    // 特殊ページ
    // TODO 特殊ページはアクションが前提としてあるので、View で実装すべきか要検討。
    //      cf) Main ページの編集は WikiContent を元に view で処理を行う。
    //      getSpecialList() も不要。
    //      !!! Special ページの存在確認が他のタイプと異なってしまうことが課題 !!!
    //          他のタイプの存在確認も含めて、別クラスとして抽出する ???
    //          Special ページの存在確認は、view の存在を確認する行為である一方で、Page や File の存在確認は
    //          データが存在するかを確認する行為であるので、全く性質が異なる。
    //
    //      Special:UploadFile は wiki.createFile or EditableFileContent.update で実現可能。
    //      Special:AllPages, Special:AllFiles は wiki.getSome() メソッドを呼び出せば実現可能。
    //      Special:SpecialPages は 他の Special ページを定義したファイルであれば実現可能 ???
    //


    private existsCheck(wikiHistory: WikiHistory<HistoricalData>, wikiName: string): boolean {
        return wikiHistory.hasName(wikiName);
    }

    private getNameList(wikiHistory: WikiHistory<HistoricalData>): string[] {
        return wikiHistory.getNameList();
    }
}


// WikiHistory を生成する。
// このクラスを通して WikiHistory を生成することで、WikiHistory の内容を同期することができる。
type WikiHistoryObj = {Main: TextWikiHistory, Template: TextWikiHistory, File: FileWikiHistory};
class WikiHistoryFactory {
    private static readonly historyMap: Map<string, WikiHistoryObj> = new Map();
    private static nsmanager: WikiNSManager = new WikiNSManager();

    private constructor() {};

    public static createTextHistory(wikiNS: string, wikiType: EditableTextType): TextWikiHistory {
        switch (wikiType) {
            case 'Main':
                return WikiHistoryFactory.createHistoryObj(wikiNS).Main;
            case 'Template':
                return WikiHistoryFactory.createHistoryObj(wikiNS).Template;
        }
    }

    public static createFileHistory(wikiNS: string, wikiType: EditableFileType): FileWikiHistory {
        switch (wikiType) {
            case 'File':
                return WikiHistoryFactory.createHistoryObj(wikiNS).File;
        }
    }

    private static addHistoryObj(shapedNS: string): WikiHistoryObj {
        const dataDir: string = WikiHistoryFactory.nsmanager.getDataDirectory(shapedNS);
        const historyObj: WikiHistoryObj = {
            Main: new TextWikiHistory(dataDir, 'Main'),
            Template: new TextWikiHistory(dataDir, 'Template'),
            File: new FileWikiHistory(dataDir, 'File')
        };
        WikiHistoryFactory.historyMap.set(shapedNS, historyObj);
        return historyObj;
    }

    private static createHistoryObj(wikiNS: string): WikiHistoryObj {
        const shapedNS: string = WikiNSManager.shape(wikiNS);
        let historyObj: WikiHistoryObj|undefined = WikiHistoryFactory.historyMap.get(shapedNS);
        if (historyObj === undefined) {
            historyObj = WikiHistoryFactory.addHistoryObj(shapedNS);
        }
        return historyObj;
    }
}


// コンテンツの最も基本となるクラス。
// View とは別であることに注意する。例えば、Main type について WikiContent で扱うのは、どのように表示するかではなく、
// 表示するときに必要となる文字列を管理する。
abstract class WikiContent {
    abstract content: string;

    public constructor(public readonly wikiNS: string, public readonly wikiType: string, public readonly wikiName: string) {
    }
}

// 変更可能なコンテンツ。WikiHistory によってバージョン管理される。
// アップデート・差戻しが可能。
// version は正のときはそのバージョンを示す。ゼロのときは最新バージョンを示す。負のときはその大きさ分だけ遡ったバージョンを示す。
// 例えば、-3 の時には最新より3つ前のバージョンを示す。
// version に代入して変更すれば、そのバージョンのデータが反映される。
abstract class EditableContent<S extends HistoricalData, T extends WikiHistory<S>> extends WikiContent {
    private __version!: number;

    public constructor(wikiNS: string, wikiType: EditableType, wikiName: string, version: number, protected readonly wikiHistory: T) {
        super(wikiNS, wikiType, wikiName);
        if (!this.wikiHistory.hasName(wikiName)) {
            throw new Error(`The specified wikiName was not found in wikiHistory ${wikiHistory.historyName}.: ${wikiName}`);
        }
        this.version = version;
    }

    public set version(val: number) {
        this.__version = this.absoluteVersion(val);
    }

    public get version(): number {
        return this.__version;
    }

    public abstract update(content: string, comment: string): void;

    public revert(version: number, comment: string): void {
        const absoluteVersion: number = this.absoluteVersion(version);
        this.wikiHistory.revert(this.wikiName, absoluteVersion, comment);
    }

    public get latestVersion(): number {
        return this.wikiHistory.getByName(this.wikiName).version;
    }

    private absoluteVersion(version: number): number {
        const latestVersion: number = this.latestVersion;
        if (version === 0) {
            return latestVersion;
        }
        if (version < 0 && version > -latestVersion) {
            return latestVersion + version;
        }
        if (version > 0 && version <= latestVersion) {
            return version;
        }
        throw new Error('The version is out of range. The range of version must be (-latestVersion, latestVersion]. : ' + version);
    }
}

// 変更可能なテキストコンテンツ。
// 基本ページやテンプレートページの文章を扱う。将来的にはトークページなどもこのクラスを継承する可能性がある。
// content は表示本文の文字列。
class EditableTextContent extends EditableContent<TextData, TextWikiHistory> {
    public constructor(wikiNS: string, wikiType: EditableTextType, wikiName: string, version: number=0) {
        let wikiHistory: TextWikiHistory;
        wikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, wikiType);
        super(wikiNS, wikiType, wikiName, version, wikiHistory);
    }

    public static create(wikiNS: string, wikiType: EditableTextType, wikiName: string,
                         body: string, comment: string): EditableTextContent {
        let wikiHistory: TextWikiHistory;
        wikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, wikiType);
        if (wikiHistory.hasName(wikiName)) {
            throw new Error(`The specified wikiName already exists.: ${wikiName}`);
        }
        wikiHistory.add(wikiName, body, comment);
        return new EditableTextContent(wikiNS, wikiType, wikiName);
    }

    // body
    public get content(): string {
        const text: string = this.wikiHistory.getByVersion(this.wikiName, this.version).text;
        const body: string = text;
        return body;
    }

    public update(body: string, comment: string): void {
        const text: string = body;
        this.wikiHistory.add(this.wikiName, text, comment)
    }
}

// 変更可能なファイルコンテンツ。画像ファイルやPDFファイルなどを扱う。
// content は ファイルの保存場所を示すパス。src 属性に指定するなどして利用されることを想定している。
class EditableFileContent extends EditableContent<FileData, FileWikiHistory> {
    public constructor(wikiNS: string, wikiType: EditableFileType, wikiName: string, version: number=0) {
        const wikiHistory: FileWikiHistory = WikiHistoryFactory.createFileHistory(wikiNS, wikiType);
        super(wikiNS, wikiType, wikiName, version, wikiHistory);
    }

    public static create(wikiNS: string, wikiType: EditableFileType, wikiName: string,
                         source: string, comment: string): EditableFileContent {
        const wikiHistory: FileWikiHistory = WikiHistoryFactory.createFileHistory(wikiNS, wikiType);
        if (wikiHistory.hasName(wikiName)) {
            throw new Error(`The specified wikiName already exists.: ${wikiName}`);
        }
        wikiHistory.add(wikiName, source, comment);
        return new EditableFileContent(wikiNS, wikiType, wikiName);
    }

    // filepath
    public get content(): string {
        return this.wikiHistory.getByVersion(this.wikiName, this.version).filepath;
    }

    public get filetype(): 'image'|'pdf'|'page'|'other' {
        return this.wikiHistory.getByVersion(this.wikiName, this.version).filetype;
    }

    public get filesize(): number {
        return this.wikiHistory.getByVersion(this.wikiName, this.version).filesize;
    }

    public update(source: string, comment: string): void {
        this.wikiHistory.add(this.wikiName, source, comment)
    }
}


export {Wiki, EditableTextContent, EditableFileContent};
