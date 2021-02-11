import * as fs from 'fs';
import * as path from 'path';
import {WikiConfig} from './wikiconfig';
import {BufferPathGenerator, WikiHistory} from './wikihistory';


function rootDirOf(namespace: string, wikiType: string): string {
    const config: WikiConfig = new WikiConfig();
    return path.join(config.rootDirOf(namespace), wikiType);
}


class BufferPathGeneratorFactory {
    public static create(namespace: string, wikiType: WikiType): BufferPathGenerator {
        const rootDir: string = rootDirOf(namespace, wikiType);
        if (!fs.existsSync(rootDir)) {
            fs.mkdirSync(rootDir);
        }
        return new BufferPathGenerator(rootDir);
    }
}


class WikiHistoryFactory {
    public static create(namespace: string, wikiType: WikiType): WikiHistory {
        const rootDir: string = rootDirOf(namespace, wikiType);
        if (!fs.existsSync(rootDir)) {
            fs.mkdirSync(rootDir);
        }
        return new WikiHistory(rootDir);
    }
}


export {BufferPathGeneratorFactory, WikiHistoryFactory};
