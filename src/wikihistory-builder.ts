import * as fs from 'fs';
import * as path from 'path';
import {WikiHistory, VersionData} from './wikihistory';
import {WikiConfig, MergedNamespaceConfig} from './wikiconfig';
import {WikiLink} from './wikilink';

function rootDirOf(namespace: string, wikiType: WikiType, markdown: boolean=false): string {
    const config: MergedNamespaceConfig = new WikiConfig().getNamespaceConfig(namespace);
    let rootDir: string;
    if (markdown && wikiType === 'File') {
        rootDir = path.join(config.rootDir, 'FileDescritption');
    } else {
        rootDir = path.join(config.rootDir, wikiType);
    }
    if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir);
    }
    return rootDir;
}


function createHistory(namespace: string, wikiType: WikiType, markdown: boolean=false): WikiHistory {
    const rootDir: string = rootDirOf(namespace, wikiType, markdown);
    return new WikiHistory(rootDir);
}


function toFullPath(wikiLink: WikiLink, version: number|null=null, markdown: boolean=false): string|null {
    const history: WikiHistory = createHistory(wikiLink.namespace, wikiLink.type, markdown);
    const name: string = wikiLink.name;
    if (!history.hasName(name)) {
        return null;
    }
    let data: VersionData = history.getByName(name);
    if (typeof(version) === 'number') {
        if (version > data.version || version < 1) {
            return null;
        }
        data = history.getByVersion(name, version);
    }
    return data.filepath;
}


export {createHistory, toFullPath, WikiHistory, VersionData};
