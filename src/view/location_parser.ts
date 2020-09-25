/* import {WikiType} from '../model/wiki_constant'; */
type WikiType = 'Main' | 'Template' | 'File' | 'Special';
type WikiLocation = {wikiNS: string, wikiType: WikiType, wikiName: string};

const wikiTypeMap: Map<string, WikiType> = new Map([
    ['Main', 'Main'],
    ['File', 'File'],
    ['Special', 'Special'],
    ['Template', 'Template']
]);

function isWikiLink(href: string): boolean {
    const PATTERN: RegExp = /https?:\/\/[\w\/:%#$&?()~.=+-]+/
    return href.match(PATTERN) === null;
}

function parseWikiLocation(href: string): WikiLocation {
    const loc: WikiLocation = {wikiNS: 'Wiki', wikiType: 'Main', wikiName: ''};
    const arr: string[] = href.split(':');
    const v1: WikiType|undefined = wikiTypeMap.get(arr[0]);
    const v2: WikiType|undefined = wikiTypeMap.get(arr[1]);
    const len: number = arr.length;
    if (len === 1) {
        loc.wikiName = arr[0];

    } else if (len === 2) {
        if (v1 === undefined) {
            loc.wikiNS = arr[0];
        } else {
            loc.wikiType = v1;
        }
        loc.wikiName = arr[1];

    } else if (len === 3) {
        if (v2 === undefined) {
            throw new Error(`Invalid WikiType was found: ${loc.wikiType}`);
        }
        loc.wikiNS = arr[0];
        loc.wikiType = v2;
        loc.wikiName = arr[2];

    } else {
        throw new Error(`The number of colons must be 0 to 2: ${href}`);
    }

    if (loc.wikiNS.match(/^\s*$/)) {
        throw new Error(`WikiNS must not be empty: ${href}`);
    }
    if (loc.wikiName.match(/^\s*$/)) {
        throw new Error(`WikiName must not be empty: ${href}`);
    }
    return loc;
}
