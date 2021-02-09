type WikiType = 'page'|'file';

function isWikiType(arg: any): arg is WikiType {
    if (typeof(arg) !== 'string') {
        return false;
    }
    switch (arg) {
        case 'page':
        case 'file':
            return true;
        default:
            return false;
    }
}


type WikiLinkPath = {
    namespace?: string,  // for external strages
    type?: WikiType,
    name?: string,
};

const DEFAULT_NAMESPACE: string = 'main';
const DEFAULT_TYPE: WikiType = 'page';
const DEFAULT_NAME: string = 'Main';


class WikiLink {
    static readonly SEPARATOR: string = ':';
    readonly namespace: string;
    readonly type: WikiType;
    readonly name: string;

    public constructor(path?: WikiLinkPath|string) {
        if (path === undefined) {
            path = {};
        } else if (typeof(path) === 'string') {
            path = WikiLink.parse(path);
        }
        this.namespace = (path.namespace || DEFAULT_NAMESPACE);
        this.name = (path.name || DEFAULT_NAME);
        this.type = (path.type || DEFAULT_TYPE);
    }

    public static isWikiLink(href: string): boolean {
        /* const PATTERN: RegExp = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/; */
        // begine with 'http://', 'https://' or 'file://'.
        const PATTERN: RegExp = /^(https?|file):\/\//;
        return href.match(PATTERN) === null;
    }

    public toPath(): string {
        let path: string = this.name;
        if (this.type !== DEFAULT_TYPE) {
            path = this.type + WikiLink.SEPARATOR + path;
        }
        if (this.namespace !== DEFAULT_NAMESPACE) {
            path = this.namespace + WikiLink.SEPARATOR + path;
        }
        return path;
    }

    private static parse(href: string): WikiLinkPath {
        const arr: string[] = href.split(WikiLink.SEPARATOR);
        let path: WikiLinkPath = {};
        if (arr.length === 1) {
            const v1: string = arr[0];
            if (isWikiType(v1)) {
                path.type = v1;
            } else {
                path.name = v1;
            }
            return path;
        } 

        const [v1, v2, ...remain] = arr;
        if (isWikiType(v1)) {
            path.type = v1;
            remain.unshift(v2);
        } else if (isWikiType(v2)) {
            path.namespace = v1;
            path.type = v2;
        } else {
            path.namespace = v1;
            remain.unshift(v2);
        }
        if (remain.length !== 0) {
            path.name = remain.join(WikiLink.SEPARATOR);
        }
        return path;
    }
}


export {WikiLink, DEFAULT_NAMESPACE, DEFAULT_TYPE, DEFAULT_NAME};
