import {DEFAULT_NAMESPACE} from './wikilink';
import {DATA_DIR} from './data-dir';
import * as fs from 'fs';
import * as path from 'path';


type NameSpaceType = 'internal'|'external';
interface NameSpaceConfig {
    namespace: string;
    type: NameSpaceType;
    rootDir?: string;
}

interface SideMenuConfig {
    main: SideMenuSectionData;
    sub: {title: string, data: SideMenuSectionData}[]
}

interface ConfigData {
    namespace: NameSpaceConfig[];
    sidemenu: SideMenuConfig;
}


class WikiConfig {
    private configPath: string;
    public constructor(configPath?: string, private mkdir: boolean=true) {
        this.configPath = configPath || path.join(DATA_DIR, 'config.json');
    }

    private __data: ConfigData|null = null;
    private get data(): ConfigData {
        if (this.__data !== null) {
            return this.__data;
        }
        if (fs.existsSync(this.configPath)) {
            this.__data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
            return this.__data as ConfigData;
        }

        this.__data = {
            namespace: [],
            sidemenu: {
                main: [
                    {type: 'link', text: 'Main', path: 'Main'},
                    {type: 'link', text: 'Special pages', path: 'Special:SpecialPages'},
                    {type: 'link', text: 'Upload file', path: 'Special:UploadFile'},
                ],
                sub: [],
            }
        };
        // NOTE: ディレクトリを作るために，addNameSpace を呼び出す必要がある
        this.addNameSpace({namespace: DEFAULT_NAMESPACE, type: 'internal'});
        return this.__data;
    }

    private saveData(): void {
        const text: string = JSON.stringify(this.data, null, '  ');
        fs.writeFileSync(this.configPath, text);
    }

    public addNameSpace(namespace: NameSpaceConfig): void {
        if (namespace.type === 'external' && typeof(namespace.rootDir) !== 'string') {
            throw new Error('rootDir must be string when type is external');
        }
        if (namespace.type === 'internal' && typeof(namespace.rootDir) !== 'undefined') {
            throw new Error('rootDir must be undefined when type is internal');
        }
        if (this.hasNameSpace(namespace.namespace)) {
            this.data.namespace = this.data.namespace.map(ns => {
                if (ns.namespace !== namespace.namespace) {
                    return ns;
                }
                return namespace;
            });
        } else {
            this.data.namespace.push(namespace);
        }
        this.saveData();
        if (namespace.type === 'internal') {
            const rootDir: string = this.rootDirOf(namespace.namespace);
            if (this.mkdir && !fs.existsSync(rootDir)) {
                fs.mkdirSync(rootDir);
            }
        }
    }

    public hasNameSpace(namespace: string): boolean {
        for (const ns of this.data.namespace) {
            if (ns.namespace === namespace) {
                return true;
            }
        }
        return false;
    }

    public typeOf(namespace: string): NameSpaceType {
        return this.getNameSpaceConfig(namespace).type;
    }

    public rootDirOf(namespace: string): string {
        if (this.typeOf(namespace) === 'internal') {
            return path.join(DATA_DIR, namespace);
        }
        return this.getNameSpaceConfig(namespace).rootDir as string;
    }

    private getNameSpaceConfig(namespace: string): NameSpaceConfig {
        for (const ns of this.data.namespace) {
            if (ns.namespace === namespace) {
                return ns;
            }
        }
        throw new Error('Not found the namespace: ' + namespace);
    }

    public getSideMenu(): SideMenuConfig {
        return this.data.sidemenu;
    }

    public setSideMenu(data: SideMenuConfig): void {
        this.data.sidemenu = data;
        this.saveData();
    }
}

export {WikiConfig}
