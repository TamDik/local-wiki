import {DEFAULT_NAMESPACE} from '../src/wikilink';
import {WikiConfig} from '../src/wikiconfig';
import * as fs from 'fs';
import * as path from 'path';


function unlinkConfigFile(): void {
    const configFile: string = WikiConfig.CONFIG_PATH;
    if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
    }
}

describe('test WikiConfig', () => {
    unlinkConfigFile();
    const config: WikiConfig = new WikiConfig();
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
        expect(config.rootDirOf(DEFAULT_NAMESPACE)).toBe(path.join(__dirname, '../data/', DEFAULT_NAMESPACE));
        expect(config.rootDirOf('ns1')).toBe(path.join(__dirname, '../data/ns1'));
        expect(config.rootDirOf('ns2')).toBe('rd2-changed');
    });
});
