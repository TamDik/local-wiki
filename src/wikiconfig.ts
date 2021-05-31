import {DATA_DIR, APP_DIR} from './data-dir';
import {generateRandomString} from './utils';
import * as fs from 'fs';
import * as path from 'path';


const DIST_IMAGE_DIR: string = path.join(APP_DIR, 'dist/images')

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
        const text: string = JSON.stringify(this.__data, null, 2);
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

    public static toConfigPath(rootDir: string): string {
        return path.join(rootDir, NamespaceConfig.filename);
    }

    public static hasConfig(rootDir: string): boolean {
        return fs.existsSync(rootDir) && fs.existsSync(NamespaceConfig.toConfigPath(rootDir));
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
    public static notFoundIconPath: string = path.join(DIST_IMAGE_DIR, 'not-set-icon.png');
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

    public static toIconPath(rootDir: string): string {
        return path.join(rootDir, 'icon.png');
    }

    public get iconPath(): string {
        if (this.hasIcon()) {
            return MergedNamespaceConfig.toIconPath(this.rootDir);
        }
        return MergedNamespaceConfig.notFoundIconPath;
    }

    public hasIcon(): boolean {
        return fs.existsSync(MergedNamespaceConfig.toIconPath(this.rootDir));
    }

    public updateIcon(base64Icon: string): void {
        const buffer: Buffer = Buffer.from(base64Icon, 'base64');
        const iconPath = MergedNamespaceConfig.toIconPath(this.rootDir);
        fs.writeFile(iconPath, buffer, (e) => {
            if (e) console.log(e);
        });
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
            } else if (NamespaceConfig.hasConfig(data.rootDir)) {
                config = NamespaceConfig.createExternal(data.rootDir);
            } else {
                this.masterConfig.removeNamespace(data.id);
                continue;
            }
            this.setNamespace(config);
        }
    }

    private setNamespace(config: NamespaceConfig): MergedNamespaceConfig {
        const mergedConfig: MergedNamespaceConfig = new MergedNamespaceConfig(this.masterConfig, config);
        this.namespaceConfigs.push(mergedConfig);
        return mergedConfig;
    }

    public getNamespaceConfig(value: string, target?: SearchNamespaceTarget): MergedNamespaceConfig {
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
        throw new Error(`Not found the config: ${value}`);
    }

    public getNamespaces(): MergedNamespaceConfig[] {
        return this.namespaceConfigs;
    }

    public revertExternalNamespace(rootDir: string): MergedNamespaceConfig {
        if (!NamespaceConfig.hasConfig(rootDir)) {
            throw new Error(`Not found an external namespace at ${rootDir}`);
        }
        const config: NamespaceConfig = NamespaceConfig.createExternal(rootDir);
        this.masterConfig.newNamespace(config.getId(), 'external', rootDir);
        return this.setNamespace(config);
    }

    public newNamespace(name: string, type: NamespaceType, base64Icon: string|null, rootDir?: string): MergedNamespaceConfig {
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
        const mergedConfig: MergedNamespaceConfig = this.setNamespace(config);
        if (typeof(base64Icon) === 'string') {
            this.saveIcon(mergedConfig, base64Icon);
        }
        return mergedConfig;
    }

    private saveIcon(config: MergedNamespaceConfig, base64Icon: string): void {
        const buffer: Buffer = Buffer.from(base64Icon, 'base64');
        const iconPath: string = MergedNamespaceConfig.toIconPath(config.rootDir);
        fs.writeFile(iconPath, buffer, (e) => {
            if (e) console.log(e);
        });
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

    public getSideMenu(): MasterConfigData['sidemenu'] {
        return this.masterConfig.getSideMenu();
    }

    public setSideMenu(data: MasterConfigData['sidemenu']): void {
        this.masterConfig.setSideMenu(data);
    }
}


function usedAsAnExternalNamespace(rootDir: string): boolean {
    return NamespaceConfig.hasConfig(rootDir);
}

function parseNamespaceConfig(rootDir: string): {id: string, name: string, type: NamespaceType, rootDir: string, iconPath: string} {
    const configPath: string = NamespaceConfig.toConfigPath(rootDir);
    const data: NamespaceConfigData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return {
        id: data.id,
        name: data.name,
        type: 'external',
        rootDir,
        iconPath: MergedNamespaceConfig.toIconPath(rootDir)
    };
}


export {WikiConfig, MergedNamespaceConfig, usedAsAnExternalNamespace, parseNamespaceConfig, setDataDir}
