import {DEFAULT_NAMESPACE} from './wikilink';
import * as fs from 'fs';
import * as path from 'path';


type NameSpaceType = 'internal'|'external';
interface NameSpaceConfig {
    namespace: string;
    type: NameSpaceType;
    rootDir?: string;
}


const DATA_DIR: string = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}


class WikiConfig {
    private data: Map<string, NameSpaceConfig>;
    private configPath: string;
    public constructor(configPath?: string, private mkdir: boolean=true) {
        this.configPath = configPath || path.join(DATA_DIR, 'config.json');
        if (fs.existsSync(this.configPath)) {
            const dataList: NameSpaceConfig[] = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
            this.data = new Map(dataList.map(data => [data.namespace, data]));
        } else {
            this.data = new Map();
            this.addNameSpace({namespace: DEFAULT_NAMESPACE, type: 'internal'});
        }
    }

    private saveConfigFile(): void {
        const data: NameSpaceConfig[] = Array.from(this.data.values());
        const text: string = JSON.stringify(data, null, '  ');
        fs.writeFileSync(this.configPath, text);
    }

    public addNameSpace(data: NameSpaceConfig): void {
        if (data.type === 'external' && typeof(data.rootDir) !== 'string') {
            throw new Error('rootDir must be string when type is external');
        }
        if (data.type === 'internal' && typeof(data.rootDir) !== 'undefined') {
            throw new Error('rootDir must be undefined when type is internal');
        }
        this.data.set(data.namespace, data);
        this.saveConfigFile();
        if (data.type === 'internal') {
            const rootDir: string = this.rootDirOf(data.namespace);
            if (this.mkdir && !fs.existsSync(rootDir)) {
                fs.mkdirSync(rootDir);
            }
        }
    }

    public hasNameSpace(ns: string): boolean {
        return this.data.has(ns);
    }

    public typeOf(ns: string): NameSpaceType {
        return this.configOf(ns).type;
    }

    public rootDirOf(ns: string): string {
        if (this.typeOf(ns) === 'internal') {
            return path.join(DATA_DIR, ns);
        }
        return this.configOf(ns).rootDir as string;
    }

    private configOf(ns: string): NameSpaceConfig {
        if (!this.hasNameSpace(ns)) {
            throw new Error('Not found the namespace: ' + ns);
        }
        return this.data.get(ns) as NameSpaceConfig;
    }
}

export {WikiConfig}
