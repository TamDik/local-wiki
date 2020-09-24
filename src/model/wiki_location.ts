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
import * as path from 'path';
import * as fs from 'fs';

type EditableTextType = 'Main' | 'Template';
type EditableFileType = 'File';
type EditableType = EditableTextType | EditableFileType;
type WikiType = EditableType | 'Special';
type WikiLocation = {ns: string, type: WikiType, name: string};


const APP_ROOT = path.join(__dirname, '..', '..', '..');
const wikiTypeMap: Map<string, WikiType> = new Map([
    ['Main', 'Main'],
    ['File', 'File'],
    ['Special', 'Special'],
    ['Template', 'Template']
]);


// WikiNSManager
class WikiNSManager {
    public static readonly DEFAULT_WIKI_NS: string = 'Wiki';
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
            return WikiNSManager.DEFAULT_WIKI_NS;
        }
        return shapedNS;
    }

    public static isDefaultNS(wikiNS: string): boolean {
        const shapedNS: string = WikiNSManager.shape(wikiNS);
        return shapedNS === WikiNSManager.DEFAULT_WIKI_NS;
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
        return [WikiNSManager.DEFAULT_WIKI_NS, ...this.data.keys()];
    }

    public getDataDirectory(wikiNS: string): string {
        if (!this.has(wikiNS)) {
            throw new Error(`WikiNS was not found: ${wikiNS}`);
        }
        if (wikiNS === WikiNSManager.DEFAULT_WIKI_NS) {
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


function parseWikiLocation(str: string): WikiLocation {
    const loc: WikiLocation = {ns: WikiNSManager.DEFAULT_WIKI_NS, type: 'Main', name: ''};
    const arr: string[] = str.split(':');
    const v1: WikiType|undefined = wikiTypeMap.get(arr[0]);
    const v2: WikiType|undefined = wikiTypeMap.get(arr[1]);
    const len: number = arr.length;
    if (len === 1) {
        loc.name = arr[0];

    } else if (len === 2) {
        if (v1 === undefined) {
            loc.ns = arr[0];
        } else {
            loc.type = v1;
        }
        loc.name = arr[1];

    } else if (len === 3) {
        if (v2 === undefined) {
            throw new Error(`Invalid WikiType was found: ${loc.type}`);
        }
        loc.ns = arr[0];
        loc.type = v2;
        loc.name = arr[2];

    } else {
        throw new Error(`The number of colons must be 0 to 2: ${str}`);
    }

    if (loc.ns.match(/^\s*$/)) {
        throw new Error(`WikiNS must not be empty: ${str}`);
    }
    if (loc.name.match(/^\s*$/)) {
        throw new Error(`WikiName must not be empty: ${str}`);
    }
    return loc;
}


export {EditableType, EditableTextType, EditableFileType, WikiType, WikiNSManager, parseWikiLocation};
