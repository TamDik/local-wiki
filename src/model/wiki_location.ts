// WikiNS:WikiType:WikiName
//
// WikiNS はデータの保存場所を示す。
// デフォルトは 'Wiki' であり、これはアプリ内に保存することを示す。'Wiki' の場合のみ WikiNS を省略することができる。
// WikiType と同名は不可。
//
// WikiType はデータの種類を示す。
//     Main: 一般的なページ（省略可能）
//     File: ファイル（画像、PDF など）
//  Special: 特殊ページ
// Template: テンプレートファイル
// (User, Project, Help, Category)
// [ CAUTION ] Special の扱いに注意。
import {WikiType, DEFAULT_NS} from './wiki_constant';
import * as path from 'path';
import * as fs from 'fs';

const APP_ROOT = path.join(__dirname, '..', '..', '..');


// WikiNSManager
class WikiNSManager {
    private readonly filename: string;
    private static __data: Map<string, string>|null = null;

    public constructor() {
        const DATA_DIR: string = path.join(APP_ROOT, 'data');
        this.filename = path.join(DATA_DIR, 'namespace.json');
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR);
        }
    }

    public static shape(wikiNS: string): string {
        const shapedNS = wikiNS.trim();
        if (wikiNS === '') {
            return DEFAULT_NS
        }
        return shapedNS;
    }

    public static isDefaultNS(wikiNS: string): boolean {
        const shapedNS: string = WikiNSManager.shape(wikiNS);
        return shapedNS === DEFAULT_NS;
    }

    public add(wikiNS: string, dataDir: string): void {
        if (this.has(wikiNS)) {
            throw new Error(`wikiNS must be unique: ${wikiNS}`);
        }
        const shapedNS: string = WikiNSManager.shape(wikiNS);
        this.data.set(wikiNS, dataDir);
        this.save();
    }

    public has(wikiNS: string): boolean {
        if (WikiNSManager.isDefaultNS(wikiNS)) {
            return true;
        }
        return this.data.has(WikiNSManager.shape(wikiNS));
    }

    public getList(): string[] {
        return [DEFAULT_NS, ...this.data.keys()];
    }

    public getDataDirectory(wikiNS: string): string {
        if (!this.has(wikiNS)) {
            throw new Error(`WikiNS was not found: ${wikiNS}`);
        }
        if (wikiNS === DEFAULT_NS) {
            return path.join(APP_ROOT, 'data')
        }
        return <string>this.data.get(wikiNS);
    }

    private get data(): Map<string, string> {
        if (WikiNSManager.__data !== null) {
            return WikiNSManager.__data;
        }
        if (!fs.existsSync(this.filename)) {
            WikiNSManager.__data = new Map<string, string>();
            return WikiNSManager.__data;
        }

        const jsonStr: string = fs.readFileSync(this.filename, 'utf-8');
        const dataArr: {wikiNS: string, dataDir: string}[] = JSON.parse(jsonStr);
        WikiNSManager.__data = new Map<string, string>();
        for (const {wikiNS, dataDir} of dataArr) {
            WikiNSManager.__data.set(wikiNS, dataDir);
        }
        return WikiNSManager.__data;
    }

    private save(): void {
        const dataArr: {wikiNS: string, dataDir: string}[] = [];
        for (const [wikiNS, dataDir] of this.data.entries()) {
            dataArr.push({wikiNS: wikiNS, dataDir: dataDir});
        }
        fs.writeFileSync(this.filename, JSON.stringify(dataArr));
    }
}


export {WikiNSManager};
