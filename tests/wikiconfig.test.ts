import {DEFAULT_NAMESPACE} from '../src/wikilink';
import {WikiConfig} from '../src/wikiconfig';
import * as fs from 'fs';
import * as path from 'path';


function unlinkConfigFile(): string {
    const configFile: string = path.join(__dirname, '../data/config-test.json');
    if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
    }
    return configFile;
}

describe('test WikiConfig', () => {
    const configFile: string = unlinkConfigFile();
    const config: WikiConfig = new WikiConfig(configFile, false);
    config.addNameSpace({namespace: 'ns1', type: 'internal'});
    config.addNameSpace({namespace: 'ns2', type: 'external', rootDir: 'rd2'});
    // changing config
    config.addNameSpace({namespace: 'ns2', type: 'external', rootDir: 'rd2-changed'});
    test('hasNameSpace', () => {
        expect(config.hasNameSpace(DEFAULT_NAMESPACE)).toBe(true);
        expect(config.hasNameSpace('ns1')).toBe(true);
        expect(config.hasNameSpace('dummy')).toBe(false);
    });

    test('typeOf', () => {
        expect(config.typeOf(DEFAULT_NAMESPACE)).toBe('internal');
        expect(config.typeOf('ns1')).toBe('internal');
        expect(config.typeOf('ns2')).toBe('external');
    });

    test('rootDirOf', () => {
        const dataDir: string = path.join(__dirname, '../../data');
        expect(config.rootDirOf(DEFAULT_NAMESPACE)).toBe(path.join(dataDir, DEFAULT_NAMESPACE));
        expect(config.rootDirOf('ns1')).toBe(path.join(dataDir, '/ns1'));
        expect(config.rootDirOf('ns2')).toBe('rd2-changed');
    });
    unlinkConfigFile();
});
