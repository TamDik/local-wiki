import * as fs from 'fs';
import {WikiLink} from './wikilink';


class ContentGenerator {
    public static createTitle(mode: PageMode, path: string): string {
        const wikiLink: WikiLink = new WikiLink(path);
        const normalizedPath: string = wikiLink.toPath();
        switch (mode) {
            case 'read':
                return normalizedPath;
            case 'edit':
                return `editing ${normalizedPath}`
            case 'history':
                return `Revision history of "${normalizedPath}"`;
        }
    }

    public static createBody(mode: PageMode, path: string): string {
        return 'body';
    }
}

export{ContentGenerator}
