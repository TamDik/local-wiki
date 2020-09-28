import {WikiNSManager} from './wiki_location';
import {WikiHistory, TextWikiHistory, FileWikiHistory} from './wiki_history';


// Wiki の内部データに対する操作を管理する。このクラスのメソッドに対する操作手順を記録して
// 再実行すれば全く同じ内部状態にすることができる。
class Wiki {
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

    public getWikiNameList(wikiNS: string, wikiType: EditableType): string[] {
        switch (wikiType) {
            case 'Main':
                return this.getPageList(wikiNS);
            case 'Template':
                return this.getTemplateList(wikiNS);
            case 'File':
                return this.getFileList(wikiNS);
        }
    }

    // EditableContent
    public getContent(wikiNS: string, wikiType: EditableType, wikiName: string, version: number=0): string {
        const editableContent: IEditableContent = this.getEditableContent(wikiNS, wikiType, wikiName, version);
        return editableContent.content;
    }

    public latestVersion(wikiNS: string, wikiType: EditableType, wikiName: string): number {
        const editableContent: IEditableContent = this.getEditableContent(wikiNS, wikiType, wikiName);
        return editableContent.latestVersion;
    }

    public createEditableContent(wikiNS: string, wikiType: EditableType, wikiName: string, content: string, comment: string): void {
        switch (wikiType) {
            case 'Main':
                this.createPage(wikiNS, wikiName, content, comment);
                break;
            case 'Template':
                this.createTemplate(wikiNS, wikiName, content, comment);
                break;
            case 'File':
                this.createFile(wikiNS, wikiName, content, comment);
                break;
        }
    }

    public updateEditableContent(wikiNS: string, wikiType: EditableType, wikiName: string, content: string, comment: string): void {
        const editableContent: IEditableContent = this.getEditableContent(wikiNS, wikiType, wikiName);
        editableContent.update(content, comment);
    }

    public revertEditableContent(wikiNS: string, wikiType: EditableType, wikiName: string, version: number, comment: string): void {
        const editableContent: IEditableContent = this.getEditableContent(wikiNS, wikiType, wikiName);
        editableContent.revert(version, comment);
    }

    public latestEditableContentVersion(wikiNS: string, wikiType: EditableType, wikiName: string): number {
        const editableContent: IEditableContent = this.getEditableContent(wikiNS, wikiType, wikiName);
        return editableContent.latestVersion;
    }

    public getHistoricalData(wikiNS: string, wikiType: EditableType, wikiName: string, version: number): HistoricalData {
        switch (wikiType) {
            case 'File':
                const fileData: HistoricalFileData = this.getFile(wikiNS, wikiName, version).historicalData;
                delete fileData.filesize;
                delete fileData.filetype;
                return fileData;
            case 'Main':
                const mainData: HistoricalTextData = this.getPage(wikiNS, wikiName, version).historicalData;
                delete mainData.text;
                return mainData;
            case 'Template':
                const templateData: HistoricalTextData = this.getTemplate(wikiNS, wikiName, version).historicalData;
                delete templateData.text;
                return templateData;
        }
    }

    public getHistoricalTextData(wikiNS: string, wikiType: EditableTextType, wikiName: string, version: number): HistoricalTextData {
        switch (wikiType) {
            case 'Main':
                return this.getPage(wikiNS, wikiName, version).historicalData;
            case 'Template':
                return this.getTemplate(wikiNS, wikiName, version).historicalData;
        }
    }

    public getHistoricalFileData(wikiNS: string, wikiType: EditableFileType, wikiName: string, version: number): HistoricalFileData {
        switch (wikiType) {
            case 'File':
                return this.getFile(wikiNS, wikiName, version).historicalData;
        }
    }

    private getEditableContent(wikiNS: string, wikiType: EditableType, wikiName: string, version: number=0): IEditableContent {
        switch (wikiType) {
            case 'Main':
                return this.getPage(wikiNS, wikiName, version);
            case 'Template':
                return this.getTemplate(wikiNS, wikiName, version);
            case 'File':
                return this.getFile(wikiNS, wikiName, version);
        }
    }


    // Page
    private hasPage(wikiNS: string, wikiName: string): boolean {
        const wikiHistory: TextWikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, 'Main');
        return this.existsCheck(wikiHistory, wikiName);
    }

    private createPage(wikiNS: string, wikiName: string, body: string, comment: string): EditableTextContent {
        return EditableTextContent.create(wikiNS, 'Main', wikiName, body, comment);
    }

    private getPage(wikiNS: string, wikiName: string, version: number=0): EditableTextContent {
        return new EditableTextContent(wikiNS, 'Main', wikiName, version);
    }

    private getPageList(wikiNS: string): string[] {
        const wikiHistory: TextWikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, 'Main');
        return this.getNameList(wikiHistory);
    }


    // Template
    private hasTemplate(wikiNS: string, wikiName: string): boolean {
        const wikiHistory: TextWikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, 'Template');
        return this.existsCheck(wikiHistory, wikiName);
    }

    private createTemplate(wikiNS: string, wikiName: string, body: string, comment: string): EditableTextContent {
        return EditableTextContent.create(wikiNS, 'Template', wikiName, body, comment);
    }

    private getTemplate(wikiNS: string, wikiName: string, version: number=0): EditableTextContent {
        return new EditableTextContent(wikiNS, 'Template', wikiName, version);
    }

    private getTemplateList(wikiNS: string): string[] {
        const wikiHistory: TextWikiHistory = WikiHistoryFactory.createTextHistory(wikiNS, 'Template');
        return this.getNameList(wikiHistory);
    }


    // File
    private hasFile(wikiNS: string, wikiName: string): boolean {
        const wikiHistory: FileWikiHistory = WikiHistoryFactory.createFileHistory(wikiNS, 'File');
        return this.existsCheck(wikiHistory, wikiName);
    }

    private createFile(wikiNS: string, wikiName: string, source: string, comment: string): EditableFileContent {
        return EditableFileContent.create(wikiNS, 'File', wikiName, source, comment);
    }

    private getFile(wikiNS: string, wikiName: string, version: number=0): EditableFileContent {
        return new EditableFileContent(wikiNS, 'File', wikiName, version);
    }

    private getFileList(wikiNS: string): string[] {
        const wikiHistory: FileWikiHistory = WikiHistoryFactory.createFileHistory(wikiNS, 'File');
        return this.getNameList(wikiHistory);
    }

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
interface IContent {
    readonly content: string;
}
abstract class WikiContent implements IContent{
    public readonly abstract content: string;

    public constructor(public readonly wikiNS: string, public readonly wikiType: string, public readonly wikiName: string) {
    }
}

// 変更可能なコンテンツ。WikiHistory によってバージョン管理される。
// アップデート・差戻しが可能。
// version は正のときはそのバージョンを示す。ゼロのときは最新バージョンを示す。負のときはその大きさ分だけ遡ったバージョンを示す。
// 例えば、-3 の時には最新より3つ前のバージョンを示す。
// version に代入して変更すれば、そのバージョンのデータが反映される。
interface IEditableContent extends IContent {
    version: number;
    update(content: string, comment: string): void;
    revert(version: number, comment: string): void;
    readonly latestVersion: number;
}

abstract class EditableContent<S extends HistoricalData, T extends WikiHistory<S>> extends WikiContent implements IEditableContent {
    private __version!: number;
    public abstract readonly historicalData: S;

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
class EditableTextContent extends EditableContent<HistoricalTextData, TextWikiHistory> {
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

    public get historicalData(): HistoricalTextData {
        return this.wikiHistory.getByVersion(this.wikiName, this.version);
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
class EditableFileContent extends EditableContent<HistoricalFileData, FileWikiHistory> {
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

    public get historicalData(): HistoricalFileData {
        return this.wikiHistory.getByVersion(this.wikiName, this.version);
    }

    // filepath
    public get content(): string {
        return this.wikiHistory.getByVersion(this.wikiName, this.version).filepath;
    }

    public update(source: string, comment: string): void {
        this.wikiHistory.add(this.wikiName, source, comment)
    }
}


export {Wiki, IEditableContent}
