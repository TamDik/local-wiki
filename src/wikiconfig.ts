import {DEFAULT_NAMESPACE} from './wikilink';
import * as fs from 'fs';
import * as path from 'path';


type NameSpaceType = 'internal'|'external';
interface NameSpaceConfig {
    namespace: string;
    type: NameSpaceType;
    rootDir?: string;
}


class WikiConfig {
    private data: Map<string, NameSpaceConfig>;
    public static readonly CONFIG_PATH: string = path.join(__dirname, '../data/config.json');
    public constructor() {
        if (fs.existsSync(WikiConfig.CONFIG_PATH)) {
            const dataList: NameSpaceConfig[] = JSON.parse(fs.readFileSync(WikiConfig.CONFIG_PATH, 'utf-8'));
            this.data = new Map(dataList.map(data => [data.namespace, data]));
        } else {
            this.data = new Map();
            this.data.set(DEFAULT_NAMESPACE, {namespace: DEFAULT_NAMESPACE, type: 'internal'});
            this.saveConfigFile();
        }
    }

    private saveConfigFile(): void {
        const data: NameSpaceConfig[] = Array.from(this.data.values());
        const text: string = JSON.stringify(data, null, '  ');
        fs.writeFileSync(WikiConfig.CONFIG_PATH, text);
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
    }

    public hasNameSpace(ns: string): boolean {
        return this.data.has(ns);
    }

    public typeOf(ns: string): NameSpaceType {
        return this.configOf(ns).type;
    }

    public rootDirOf(ns: string): string {
        if (this.typeOf(ns) === 'internal') {
            return path.join(__dirname, '../data', ns);
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
