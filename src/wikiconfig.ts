import {DATA_DIR} from './data-dir';
import {generateRandomString} from './utils';
import * as fs from 'fs';
import * as path from 'path';

let dataDir: string = DATA_DIR;
function setDataDir(dir: string): void {
    dataDir = dir;
}

type NamespaceType = 'internal'|'external';

// マスターの設定ファイルに保存するデータ（アプリに1つ存在）
type MasterConfigData = {
    namespace: (
        | {id: string, type: 'internal'}
        | {id: string, type: 'external', rootDir: string}
    )[],
    sidemenu: {
        main: SideMenuSectionData;
        sub: {title: string, data: SideMenuSectionData}[]
    },
}

// 名前空間の詳細設定ファイルに保存するデータ（名前空間ごとに1つ存在）
type NamespaceConfigData = {
    id: string,
    name: string,
}

// 名前空間に関する全てのデータ
type NamespaceData = MasterConfigData['namespace'] & NamespaceConfigData;


abstract class AbstractConfig<T> {
    private readonly configPath: string;
    public constructor(private readonly rootDir: string, filename: string='config.json') {
        this.configPath = path.join(rootDir, filename);
    }

    private __data: T|null = null;
    protected getData(): T {
        if (this.__data !== null) {
            return this.__data;
        }
        if (fs.existsSync(this.configPath)) {
            this.__data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        } else {
            this.__data = this.getDefaultData();
        }
        return this.__data as T;
    }

    protected abstract getDefaultData(): T;

    protected setData(data: T) {
        this.__data = data;
        const text: string = JSON.stringify(this.__data, null, '  ');
        fs.writeFileSync(this.configPath, text);
    }
}


class MasterConfig extends AbstractConfig<MasterConfigData> {
    public constructor() {
        super(dataDir);
    }

    protected getDefaultData(): MasterConfigData {
        const data: MasterConfigData = {
            namespace: [],
            sidemenu: {main: [], sub: []}
        };
        return data;
    }

    public newNamespace(id: string, type: NamespaceType, rootDir?: string): MasterConfigData['namespace'][number] {
        let newData: MasterConfigData['namespace'][number];
        switch (type) {
            case 'external':
                if (typeof(rootDir) !== 'string') {
                    throw new Error('rootDir must be string when type is external');
                }
                newData = {id, type, rootDir};
                break;
            case 'internal':
                if (typeof(rootDir) !== 'undefined') {
                    throw new Error('rootDir must be undefined when type is internal');
                }
                newData = {id, type}
                break;
        }
        const data: MasterConfigData = this.getData();
        data.namespace.push(newData);
        this.setData(data);
        return newData;
    }

    public getNamespaces(): MasterConfigData['namespace'] {
        return this.getData().namespace;
    }

    public getNamespace(id: string): MasterConfigData['namespace'][number] {
        const namespaces: MasterConfigData['namespace'] = this.getData().namespace;
        for (const namespace of namespaces) {
            if (namespace.id === id) {
                return namespace;
            }
        }
        throw new Error(`Not found the id: ${id}`);
    }

    public removeNamespace(id: string): void {
        const data: MasterConfigData = this.getData();
        data.namespace = data.namespace.filter(namespace => namespace.id !== id);
        this.setData(data);
    }

    public getSideMenu(): MasterConfigData['sidemenu'] {
        return this.getData().sidemenu;
    }

    public setSideMenu(sideMenuData: MasterConfigData['sidemenu']): void {
        const data: MasterConfigData = this.getData();
        data.sidemenu = sideMenuData;
        this.setData(data);
    }
}


class NamespaceConfig extends AbstractConfig<NamespaceConfigData> {
    private rootDir_: string;
    private static readonly filename: string = 'config.json';
    private constructor(rootDir: string) {
        super(rootDir, NamespaceConfig.filename);
        this.rootDir_ = rootDir;
    }

    public static internalRootDir(id: string): string {
        return path.join(dataDir, id);
    }

    public static createInternal(id: string): NamespaceConfig {
        return new NamespaceConfig(NamespaceConfig.internalRootDir(id));
    }

    public static createExternal(rootDir: string): NamespaceConfig {
        return new NamespaceConfig(rootDir);
    }

    public static hasConfig(rootDir: string): boolean {
        return fs.existsSync(rootDir) && fs.existsSync(path.join(rootDir, NamespaceConfig.filename));
    }

    public static createNewInternal(id: string, name: string): NamespaceConfig {
        const rootDir: string = NamespaceConfig.internalRootDir(id);
        if (!fs.existsSync(rootDir)) {
            fs.mkdirSync(rootDir);
        }
        const config: NamespaceConfig = this.createInternal(id);
        const data: NamespaceConfigData = config.getData();
        data.id = id;
        data.name = name;
        config.setData(data);
        return config;
    }

    public static createNewExternal(id: string, name: string, rootDir: string): NamespaceConfig {
        const config: NamespaceConfig = this.createExternal(rootDir);
        const data: NamespaceConfigData = config.getData();
        data.id = id;
        data.name = name;
        config.setData(data);
        return config;
    }

    protected getDefaultData(): NamespaceConfigData {
        const data: NamespaceConfigData = {
            id: '',
            name: ''
        };
        return data;
    }

    public getName(): string {
        return this.getData().name;
    }

    public setName(value: string): void {
        const data: NamespaceConfigData = this.getData();
        data.name = value;
        this.setData(data);
    }

    public getId(): string {
        return this.getData().id;
    }

    public getRootDir(): string {
        return this.rootDir_;
    }
}


class MergedNamespaceConfig {
    private readonly masterData: MasterConfigData['namespace'][number];
    public constructor(masterConfig: MasterConfig, private readonly namespaceConfig: NamespaceConfig) {
        this.masterData = masterConfig.getNamespace(this.id);
    }

    public get name(): string {
        return this.namespaceConfig.getName();
    }

    public set name(value: string) {
        this.namespaceConfig.setName(value);
    }

    public get id(): string {
        return this.namespaceConfig.getId();
    }

    public get rootDir(): string {
        return this.namespaceConfig.getRootDir();
    }

    public get type(): NamespaceType {
        return this.masterData.type;
    }
}


type SearchNamespaceTarget = {id?: boolean, name?: boolean};
class WikiConfig {
    private readonly masterConfig: MasterConfig;

    private namespaceConfigs: MergedNamespaceConfig[];
    public constructor() {
        this.masterConfig = new MasterConfig();
        this.namespaceConfigs = [];
        for (const data of this.masterConfig.getNamespaces()) {
            let config: NamespaceConfig;
            if (data.type === 'internal') {
                config = NamespaceConfig.createInternal(data.id);
            } else {
                config = NamespaceConfig.createExternal(data.rootDir);
            }
            this.setNamespace(config);
        }
    }

    private setNamespace(config: NamespaceConfig): MergedNamespaceConfig {
        const mergedConfig: MergedNamespaceConfig = new MergedNamespaceConfig(this.masterConfig, config);
        this.namespaceConfigs.push(mergedConfig);
        return mergedConfig;
    }

    private getNamespaceConfig(value: string, target?: SearchNamespaceTarget): MergedNamespaceConfig {
        if (this.checkTarget(target, 'id')) {
            for (const config of this.namespaceConfigs) {
                if (config.id === value) {
                    return config;
                }
            }
        }
        if (this.checkTarget(target, 'name')) {
            for (const config of this.namespaceConfigs) {
                if (config.name === value) {
                    return config;
                }
            }
        }
        throw new Error(`Not found the config: ${name}`);
    }

    public getNamespaces(): MergedNamespaceConfig[] {
        return this.namespaceConfigs;
    }

    public static usedAsAnExternalNamespace(rootDir: string): boolean {
        return NamespaceConfig.hasConfig(rootDir);
    }

    public revertExternalNamespace(rootDir: string): MergedNamespaceConfig {
        if (!NamespaceConfig.hasConfig(rootDir)) {
            throw new Error(`Not found an external namespace at ${rootDir}`);
        }
        const config: NamespaceConfig = NamespaceConfig.createExternal(rootDir);
        this.masterConfig.newNamespace(config.getId(), 'external', rootDir);
        return this.setNamespace(config);
    }

    public newNamespace(name: string, type: NamespaceType, rootDir?: string): MergedNamespaceConfig {
        let config: NamespaceConfig;
        const id: string = generateRandomString(6);
        const data: MasterConfigData['namespace'][number] = this.masterConfig.newNamespace(id, type, rootDir);
        switch (data.type) {
            case 'internal':
                config = NamespaceConfig.createNewInternal(id, name);
                break;
            case 'external':
                config = NamespaceConfig.createNewExternal(id, name, data.rootDir);
                break;
        }
        return this.setNamespace(config);
    }

    public removeNamespace(id: string): void {
        this.masterConfig.removeNamespace(id);
        this.namespaceConfigs = this.namespaceConfigs.filter(config => config.id !== id);
    }

    public hasNamespace(value: string, target?: SearchNamespaceTarget): boolean {
        for (const config of this.namespaceConfigs.values()) {
            if (this.checkTarget(target, 'id') && config.id === value) {
                return true;
            }
            if (this.checkTarget(target, 'name') && config.name === value) {
                return true;
            }
        }
        return false;
    }

    private checkTarget(target: SearchNamespaceTarget|undefined, key: keyof SearchNamespaceTarget): boolean {
        return target === undefined || target[key] === true;
    }

    public typeOf(value: string, target?: SearchNamespaceTarget): NamespaceType {
        return this.getNamespaceConfig(value, target).type;
    }

    public rootDirOf(value: string, target?: SearchNamespaceTarget): string {
        return this.getNamespaceConfig(value, target).rootDir;
    }

    public getSideMenu(): MasterConfigData['sidemenu'] {
        return this.masterConfig.getSideMenu();
    }

    public setSideMenu(data: MasterConfigData['sidemenu']): void {
        this.masterConfig.setSideMenu(data);
    }
}


export {WikiConfig, MergedNamespaceConfig, setDataDir}
