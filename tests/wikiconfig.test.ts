import {WikiConfig, setDataDir} from '../src/wikiconfig';
import {DATA_DIR} from '../src/data-dir';
import {generateRandomString} from '../src/utils';
import * as fs from 'fs';
import * as path from 'path';


function externalNamespace(externalDir: string): {id: string, name: string, rootDir: string} {
    setDataDir(externalDir);
    const rootDir: string = path.join(externalDir, 'reverted-external-' + generateRandomString(5));
    const config: WikiConfig = new WikiConfig();
    fs.mkdirSync(rootDir);
    const name: string = 'reverted-external-' + generateRandomString(5);
    const nsId: string = config.newNamespace(name, 'external', null, rootDir).id;
    return {id: nsId, name, rootDir};
}

describe('test WikiConfig', () => {
    const testDataDir = path.join(__dirname, 'data');
    const externalDir = path.join(testDataDir, 'external');
    const masterConfigPath: string = path.join(testDataDir, 'config.json');
    if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir);
    }
    if (!fs.existsSync(externalDir)) {
        fs.mkdirSync(externalDir);
    }
    if (fs.existsSync(masterConfigPath)) {
        fs.unlinkSync(masterConfigPath);
    }
    const exns = externalNamespace(externalDir);

    // テスト用のデータディレクトリをセット
    setDataDir(testDataDir);
    const config: WikiConfig = new WikiConfig();

    // 内部リンク
    const ns1 = config.newNamespace('ns1', 'internal', null);
    const ns2 = config.newNamespace('ns2', 'internal', null);
    const ns2NameBeforeChanging: string = ns2.name;
    ns2.name = 'changed-ns2';  // changing name
    const ns2NameAfterChanging: string = ns2.name;
    const removed = config.newNamespace('removed', 'internal', null);
    config.removeNamespace(removed.id);

    // 外部リンク
    const ns3RootDir: string = path.join(externalDir, generateRandomString(6));
    fs.mkdirSync(ns3RootDir);
    const ns3 = config.newNamespace('ns3', 'external', null, ns3RootDir);
    const ns4 = config.revertExternalNamespace(exns.rootDir);

    test('name after changing', () => {
        expect(ns2NameBeforeChanging).toBe('ns2');
    });

    test('name before changing', () => {
        expect(ns2NameAfterChanging).toBe('changed-ns2');
    });

    test('getNamespaces', () => {
        expect(config.getNamespaces()).toEqual([ns1, ns2, ns3, ns4]);
    });

    test('hasNamespace', () => {
        expect(config.hasNamespace(ns1.name)).toBe(true);
        expect(config.hasNamespace(ns1.id)).toBe(true);
        expect(config.hasNamespace(ns2.id)).toBe(true);
        expect(config.hasNamespace(ns3.id)).toBe(true);
        expect(config.hasNamespace('dummy')).toBe(false);
    });

    test('typeOf', () => {
        expect(config.typeOf(ns1.name)).toBe('internal');
        expect(config.typeOf(ns1.id)).toBe('internal');
        expect(config.typeOf(ns3.id)).toBe('external');
    });

    test('rootDirOf', () => {
        expect(config.rootDirOf(ns1.name)).toBe(path.join(testDataDir, ns1.id));
        expect(config.rootDirOf(ns1.id)).toBe(path.join(testDataDir, ns1.id));
        expect(config.rootDirOf(ns3.id)).toBe(ns3RootDir);
    });

    test('revertExternalNamespace', () => {
        expect(WikiConfig.usedAsAnExternalNamespace(externalDir)).toBe(true);
        expect(WikiConfig.usedAsAnExternalNamespace('dummy')).toBe(false);
        expect(ns4.id).toBe(exns.id);
        expect(ns4.name).toBe(exns.name);
        expect(ns4.rootDir).toBe(exns.rootDir);
        expect(config.hasNamespace(ns4.name)).toBe(true);
        expect(config.hasNamespace(ns4.id)).toBe(true);
        expect(config.typeOf(ns4.id)).toBe('external');
        expect(config.rootDirOf(ns4.id)).toBe(ns4.rootDir);
    });
});
