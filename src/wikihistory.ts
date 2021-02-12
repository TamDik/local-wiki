import * as fs from 'fs';
import * as path from 'path';
import {generateRandomString, date2str} from './util';

// TODO: 名前空間からパスを解決するクラス


interface VersionData {
    id: string;
    name: string;
    version: number;
    next: string|null;
    prev: string|null;
    created: string;
    comment: string;
    filename: string;
}


// generate the full path including buffer directories
class BufferPathGenerator {
    private step: number = 2;
    private depth: number = 1;
    public constructor(private readonly rootDir: string) {
    }

    public execute(filename: string, mkdir: boolean=true): string {
        const chars: string[] = Array.from(filename);
        const nameLen: number = filename.length;

        const bufferDirs: string[] = [];
        while (chars.length > this.step && bufferDirs.length < this.depth) {
            let buffer: string = '';
            for (let i = 0; i < this.step; i++) {
                buffer += chars.shift();
            }
            bufferDirs.push(buffer);
        }

        let dirpath: string = this.rootDir;
        for (const bufferDir of bufferDirs) {
            dirpath = path.join(dirpath, bufferDir);
            if (mkdir && !fs.existsSync(dirpath)) {
                fs.mkdirSync(dirpath);
            }
        }
        return path.join(dirpath, filename);
    }

    public setBufferSetp(step: number): void {
        if (step < 1) {
            throw new Error('step must be greater than 1');
        }
        this.step = step;
    }

    public setBufferDepth(depth: number): void {
        if (depth < 0) {
            throw new Error('depth must be greater than 0');
        }
        this.depth = depth;
    }
}


class WikiHistory {
    private readonly current: CurrentVersionManager;
    private readonly version: PreviousVersionManager;
    public constructor(private readonly rootDir: string) {
        this.current = new CurrentVersionManager(this.rootDir);
        this.version = new PreviousVersionManager(this.rootDir);
    }

    public hasId(id: string): boolean {
        return this.version.hasId(id);
    }

    public hasName(name: string): boolean {
        return this.current.hasName(name);
    }

    public getCurrentList(): VersionData[] {
        const names: string[] = this.current.getNameList();
        return names.map(name => this.getByName(name));
    }

    public getById(id: string): VersionData {
        return this.version.getData(id);
    }

    public getByName(name: string): VersionData {
        const id: string = this.current.getId(name);
        return this.getById(id);
    }

    public getByVersion(name: string, version: number): VersionData {
        let data: VersionData = this.getByName(name);
        if (data.version === version) {
            return data;
        }
        while (data.prev !== null) {
            data = this.getById(data.prev);
            if (data.version === version) {
                return data;
            }
        }
        throw new Error(`Not found version ${version} of ${name}`);
    }

    public add(data: {name: string, comment: string, filename: string, created?: Date}): VersionData {
        const {name, comment, filename, created} = data;
        let prev: string|null = null;
        let version: number = 1;
        if (this.hasName(name)) {
            const prevData: VersionData = this.getByName(name);
            prev = prevData.id;
            version = prevData.version + 1;
        }
        const newData: VersionData = {
            name, comment, filename, version, prev,
            id: generateRandomString(16),
            next: null,
            created: date2str(created || new Date())
        };
        this.current.add(newData);
        this.version.add(newData);
        return newData;
    }

    public revert(id: string): VersionData {
        const newData: VersionData = {...this.getById(id)};
        const latestData: VersionData = this.getLatestVersion(id);
        newData.id = generateRandomString(16);
        newData.next = null;
        newData.prev = latestData.id;
        newData.version = latestData.version + 1;
        this.current.add(newData);
        this.version.add(newData);
        return newData;
    }

    private getLatestVersion(id: string): VersionData {
        let data: VersionData = this.getById(id);
        while (data.next !== null) {
            data = this.getById(data.next);
        }
        return data;
    }

    public getPrevOf(id: string, maxSize: number=-1): VersionData[] {
        return this.version.prevOf(id, maxSize);
    }

    public getNextOf(id: string, maxSize: number=-1): VersionData[] {
        return this.version.nextOf(id, maxSize);
    }
}


type currentData = {name: string, id: string};
class CurrentVersionManager {
    static FILENAME: string = 'current.json';

    public constructor(private readonly rootDir: string) {
    }

    private get filepath(): string {
        return path.join(this.rootDir, CurrentVersionManager.FILENAME);
    }

    private __dataList: currentData[]|null = null;
    private set dataList(data: currentData[]) {
        this.__dataList = data;
    }

    private get dataList(): currentData[] {
        if (this.__dataList !== null) {
            return this.__dataList;
        }
        const filepath: string = this.filepath;
        if (!fs.existsSync(filepath)) {
            this.__dataList = [];
            return [];
        }
        const text: string = fs.readFileSync(filepath, 'utf-8');
        const data: currentData[] = JSON.parse(text);
        this.__dataList = data;
        return data;
    }

    private save(): void {
        const text: string = JSON.stringify(this.dataList, null, '  ');
        fs.writeFileSync(this.filepath, text);
    }

    public hasName(name: string): boolean {
        for (const data of this.dataList) {
            if (data.name === name) {
                return true;
            }
        }
        return false;
    }

    public getId(name: string): string {
        for (const data of this.dataList) {
            if (data.name === name) {
                return data.id;
            }
        }
        throw new Error('Not found the name: ' + name);
    }

    public getNameList(): string[] {
        return this.dataList.map(data => data.name);
    }

    public add(data: {name: string, id: string}|VersionData): void {
        const {name, id} = data;
        if (!this.hasName(name)) {
            this.dataList.push({name, id});
        } else {
            this.dataList = this.dataList.map(data => {
                if (data.name === name) {
                    return {name, id};
                }
                return data;
            });
        }
        this.save();
    }
}


class PreviousVersionManager {
    static FILENAME: string = 'history.json';

    public constructor(private readonly rootDir: string) {
    }

    private get filepath(): string {
        return path.join(this.rootDir, PreviousVersionManager.FILENAME);
    }

    private __dataMap: Map<string, VersionData>|null = null;
    private get dataMap(): Map<string, VersionData> {
        if (this.__dataMap !== null) {
            return this.__dataMap;
        }
        const filepath: string = this.filepath;
        if (!fs.existsSync(filepath)) {
            const data = new Map();
            this.__dataMap = data;
            return data;
        }
        const text: string = fs.readFileSync(filepath, 'utf-8');
        const dataList: VersionData[] = JSON.parse(text);
        const dataMap: Map<string, VersionData> = new Map(dataList.map(data => [data.id, data]));
        this.__dataMap = dataMap;
        return dataMap;
    }

    public add(data: VersionData): void {
        const dataMap: Map<string, VersionData> = this.dataMap;
        dataMap.set(data.id, data);
        if (data.prev !== null) {
            // NOTE: prev が設定されていた場合，prev の next を更新
            const prev: VersionData = this.getData(data.prev);
            prev.next = data.id;
        }
        this.save();
    }

    private save(): void {
        const data: VersionData[] = Array.from(this.dataMap.values()).map(data => data);
        const text: string = JSON.stringify(data, null, '  ');
        fs.writeFileSync(this.filepath, text);
    }

    public hasId(id: string): boolean {
        return this.dataMap.has(id);
    }

    public prevOf(firstId: string, maxSize: number=-1): VersionData[] {
        const dataList: VersionData[] = [];
        let data: VersionData = this.getData(firstId);
        dataList.push(data);
        while (data.prev !== null) {
            if (maxSize > 0 && dataList.length >= maxSize) {
                break;
            }
            data = this.dataMap.get(data.prev) as VersionData;
            dataList.push(data);
        }
        return dataList;
    }

    public nextOf(firstId: string, maxSize: number=-1): VersionData[] {
        const dataList: VersionData[] = [];
        let data: VersionData = this.getData(firstId);
        dataList.push(data);
        while (data.next !== null) {
            if (maxSize > 0 && dataList.length >= maxSize) {
                break;
            }
            data = this.dataMap.get(data.next) as VersionData;
            dataList.push(data);
        }
        return dataList;
    }

    public getData(id: string): VersionData {
        if (!this.hasId(id)) {
            throw new Error('Not found the id: ' + id);
        }
        return this.dataMap.get(id) as VersionData;
    }
}


export{BufferPathGenerator, WikiHistory, CurrentVersionManager, PreviousVersionManager, VersionData};
