import * as util from '../util';
import * as fs from 'fs';
import * as path from 'path';


// HistoricalData
interface HistoricalDataToSave {
    id: string;
    name: string;
    version: number;
    next: string|null;
    prev: string|null;
    created: string;
    comment: string;
    filename: string;
}

// WikiHistory
abstract class WikiHistory<T extends HistoricalData> {
    private currentFile: string;
    private historyFile: string;
    private individualDir: string;
    private __idToData: Map<string, HistoricalDataToSave>|null = null;
    private __nameToCurrentId: Map<string, string>|null = null;

    public constructor(dataDir: string, public readonly historyName: string) {
        this.individualDir = path.join(dataDir, historyName);
        this.currentFile = path.join(dataDir, `${historyName}_current.txt`);
        this.historyFile = path.join(dataDir, `${historyName}_history.txt`);
        this.setup();
    }

    public hasName(name: string): boolean {
        return this.nameToCurrentId.has(name);
    }

    public hasId(id: string): boolean {
        return this.idToData.has(id);
    }

    // returns a list of names. doSort specifies whether to sort.
    public getNameList(doSort: boolean=false): string[] {
        let wikiNames: string[] = [...this.nameToCurrentId.keys()];
        if (doSort) {
            wikiNames = wikiNames.sort((a, b) => {
                const A = a.toUpperCase();
                const B = b.toUpperCase();
                if (A > B) {
                    return 1;
                } else if (A < B) {
                    return -1;
                }
                return 0;
            });
        }
        return wikiNames;
    }

    public revert(name: string, version: number, comment: string): void {
        const {filename} = this.getByVersion(name, version);
        this.addData(name, filename, comment);
    }

    public getById(id: string): T {
        const data: HistoricalDataToSave|undefined = this.idToData.get(id);
        if (data === undefined) {
            throw new Error('Not found the data by id: ' + id);
        }
        const historicalData: HistoricalData = {
            id: data.id,
            name: data.name,
            version: data.version,
            next: data.next,
            prev: data.prev,
            updated: data.created,
            comment: data.comment,
            filename: data.filename,
            filepath: this.filenameToFilepath(data.filename)
        };
        return this.extendHistoricalData(historicalData);
    }

    public getByName(name: string): T {
        const id: string|undefined = this.nameToCurrentId.get(name);
        if (id === undefined) {
            throw new Error('Not found the data by name: ' + name);
        }
        return this.getById(id);
    }

    public getByVersion(name: string, version: number): T {
        let data: T = this.getByName(name);
        while (true) {
            if (data.version === version) {
                return data;
            }
            if (data.prev === null) {
                break;
            }
            data = this.getById(data.prev);
        }
        throw new Error('Not found the data by version: ' + version);
    }

    protected abstract extendHistoricalData(historicalData: HistoricalData): T;

    // filename is the save destination. The directory is resolved automatically and you only have to specify the file name.
    protected addData(name: string, filename: string, comment: string): void {
        const dataId: string = util.createId();
        let prev: string|null = null;
        let version: number = 1;
        if (this.hasName(name)) {
            const prevId: string = <string>this.nameToCurrentId.get(name);
            const prevData: HistoricalDataToSave = <HistoricalDataToSave>this.idToData.get(prevId);
            version = prevData.version + 1;
            prevData.next = dataId;
            prev = prevData.id;
        }

        const data: HistoricalDataToSave = {
            id: dataId,
            name: name,
            version: version,
            filename: filename,
            created: util.date2str(new Date()),
            comment: comment,
            prev: prev,
            next: null
        };
        this.idToData.set(data.id, data);
        this.nameToCurrentId.set(name, data.id);
        this.save();
    }

    // convert filename to file path
    protected filenameToFilepath(filename: string): string {
        const bufferDir: string = path.join(this.individualDir, filename[0] + filename[1]);
        if (!fs.existsSync(bufferDir)) {
            fs.mkdirSync(bufferDir);
        }
        return path.join(bufferDir, filename);
    }

    // setup
    private setup(): void {
        if (!fs.existsSync(this.individualDir)) {
            fs.mkdirSync(this.individualDir);
        }
    }

    private get idToData(): Map<string, HistoricalDataToSave> {
        if (this.__idToData === null) {
            this.__idToData = new Map();
            this.loadHistoryFile();
        }
        return this.__idToData;
    }

    private get nameToCurrentId(): Map<string, string> {
        if (this.__nameToCurrentId === null) {
            this.__nameToCurrentId = new Map();
            this.loadCurrentFile();
        }
        return this.__nameToCurrentId;
    }

    private loadHistoryFile(): void {
        if (!fs.existsSync(this.historyFile)) {
            return;
        }
        const data: string = fs.readFileSync(this.historyFile, 'utf-8');
        for (const line of data.split('\n')) {
            const [id, data]: string[] = line.split(/(?<=^[^,]+),/);
            const historicalData: HistoricalDataToSave = JSON.parse(data);
            this.idToData.set(id, historicalData);
        }
    }

    private loadCurrentFile(): void {
        if (!fs.existsSync(this.currentFile)) {
            return;
        }
        const data: string = fs.readFileSync(this.currentFile, 'utf-8');
        for (const line of data.split('\n')) {
            const [id, name]: string[] = line.split(',');
            this.nameToCurrentId.set(name, id);
        }
    }

    // save
    private save(): void {
        this.saveCurrentFile();
        this.saveHistoryFile();
    }
    private saveCurrentFile(): void {
        const lines: string[] = [];
        for (const [name, id] of this.nameToCurrentId.entries()) {
            lines.push(id + ',' + name);
        }
        fs.writeFileSync(this.currentFile, lines.join('\n'));
    }
    private saveHistoryFile(): void {
        const lines: string[] = [];
        for (const [id, data] of this.idToData.entries()) {
            lines.push(id + ',' + JSON.stringify(data))
        }
        fs.writeFileSync(this.historyFile, lines.join('\n'));
    }
}


class TextWikiHistory extends WikiHistory<HistoricalTextData> {
    public add(name: string, text: string, comment: string): void {
        const filename: string = util.createId() + '.json';
        this.addData(name, filename, comment);
        const data = {text: text};
        fs.writeFileSync(this.filenameToFilepath(filename), JSON.stringify(data));
    }

    protected extendHistoricalData(data: HistoricalData): HistoricalTextData {
        const {text} = JSON.parse(fs.readFileSync(data.filepath, 'utf-8'));
        return {
            id: data.id,
            name: data.name,
            version: data.version,
            next: data.next,
            prev: data.prev,
            updated: data.updated,
            comment: data.comment,
            filename: data.filename,
            filepath: data.filepath,
            text: text
        }
    }
}


class FileWikiHistory extends WikiHistory<HistoricalFileData> {
    public add(name: string, source: string, comment: string): void {
        const filename: string = this.createFilename(source);
        this.addData(name, filename, comment);
        fs.copyFileSync(source, this.filenameToFilepath(filename));
    }

    protected extendHistoricalData(data: HistoricalData): HistoricalFileData {
        const filename: string = data.filename;
        return {
            id: data.id,
            name: data.name,
            version: data.version,
            next: data.next,
            prev: data.prev,
            updated: data.updated,
            comment: data.comment,
            filename: data.filename,
            filepath: data.filepath,
            filesize: this.filenameToSize(filename),
            filetype: this.filenameToFiletype(filename)
        }
    }

    private createFilename(source: string): string {
        const fileId: string = util.createId();
        const fileSize: number = fs.statSync(source).size;
        const extention: string = source.replace(/^.*\./, '');
        return `${fileId}-${fileSize}.${extention}`;
    }

    private filenameToSize(filename: string): number {
        const sizeStr: string = filename.replace(/^.*-/, '').replace(/\.[^.]*$/, '');
        const sizeInt: number = parseInt(sizeStr);
        if (isNaN(sizeInt)) {
            return -1;
        }
        return sizeInt;
    }

    private filenameToFiletype(filename: string): FileType{
        const IMAGE_EXTENTIONS = ['png', 'jpg', 'jpeg', 'gif'];
        const PDF_EXTENTIONS = ['pdf'];
        const PAGE_EXTENTIONS = ['md'];
        const extention: string = filename.replace(/^.*\./, '');
        if (IMAGE_EXTENTIONS.includes(extention)) {
            return 'image';
        }
        if (PDF_EXTENTIONS.includes(extention)) {
            return 'pdf';
        }
        if (PAGE_EXTENTIONS.includes(extention)) {
            return 'page';
        }
        return 'other';
    }
}


export {WikiHistory, TextWikiHistory, FileWikiHistory};
