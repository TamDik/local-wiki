import {WikiType} from '../model/wiki_constant';
type WikiLocation = {ns: string, type: WikiType, name: string};

const wikiTypeMap: Map<string, WikiType> = new Map([
    ['Main', 'Main'],
    ['File', 'File'],
    ['Special', 'Special'],
    ['Template', 'Template']
]);

function parseWikiLocation(str: string): WikiLocation {
    const loc: WikiLocation = {ns: 'Wiki', type: 'Main', name: ''};
    const arr: string[] = str.split(':');
    const v1: WikiType|undefined = wikiTypeMap.get(arr[0]);
    const v2: WikiType|undefined = wikiTypeMap.get(arr[1]);
    const len: number = arr.length;
    if (len === 1) {
        loc.name = arr[0];

    } else if (len === 2) {
        if (v1 === undefined) {
            loc.ns = arr[0];
        } else {
            loc.type = v1;
        }
        loc.name = arr[1];

    } else if (len === 3) {
        if (v2 === undefined) {
            throw new Error(`Invalid WikiType was found: ${loc.type}`);
        }
        loc.ns = arr[0];
        loc.type = v2;
        loc.name = arr[2];

    } else {
        throw new Error(`The number of colons must be 0 to 2: ${str}`);
    }

    if (loc.ns.match(/^\s*$/)) {
        throw new Error(`WikiNS must not be empty: ${str}`);
    }
    if (loc.name.match(/^\s*$/)) {
        throw new Error(`WikiName must not be empty: ${str}`);
    }
    return loc;
}

