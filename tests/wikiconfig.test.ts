import {DEFAULT_NAMESPACE} from '../src/wikilink';
import {WikiConfig} from '../src/wikiconfig';
import {DATA_DIR} from '../src/data-dir';
import * as fs from 'fs';
import * as path from 'path';


function unlinkConfigFile(): string {
    const configFile: string = path.join(DATA_DIR, 'config-test.json');
    if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
    }
    return configFile;
}

describe('test WikiConfig', () => {
    const configFile: string = unlinkConfigFile();
    const config: WikiConfig = new WikiConfig(configFile, false);
    config.addNamespace({namespace: 'ns1', type: 'internal'});
    config.addNamespace({namespace: 'ns2', type: 'external', rootDir: 'rd2'});
    // changing config
    config.addNamespace({namespace: 'ns2', type: 'external', rootDir: 'rd2-changed'});
    test('hasNamespace', () => {
        expect(config.hasNamespace(DEFAULT_NAMESPACE)).toBe(true);
        expect(config.hasNamespace('ns1')).toBe(true);
        expect(config.hasNamespace('dummy')).toBe(false);
    });

    test('typeOf', () => {
        expect(config.typeOf(DEFAULT_NAMESPACE)).toBe('internal');
        expect(config.typeOf('ns1')).toBe('internal');
        expect(config.typeOf('ns2')).toBe('external');
    });

    test('rootDirOf', () => {
        expect(config.rootDirOf(DEFAULT_NAMESPACE)).toBe(path.join(DATA_DIR, DEFAULT_NAMESPACE));
        expect(config.rootDirOf('ns1')).toBe(path.join(DATA_DIR, 'ns1'));
        expect(config.rootDirOf('ns2')).toBe('rd2-changed');
    });
    unlinkConfigFile();
});
