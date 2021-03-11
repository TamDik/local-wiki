import {dateToStr} from '../utils';
import {ContentBody} from './content-body';
import {WikiLink, WikiLocation} from '../wikilink';
import {createHistory, WikiHistory, VersionData} from '../wikihistory-builder';
import {PageDiffBody} from './special-body';


class NotFoundVersionBody extends ContentBody {
    public constructor(wikiLink: WikiLink, private readonly version: number) {
        super(wikiLink);
    }

    public get html(): string {
        const lines: string[] = [
            '<div class="alert alert-danger" role="alert">',
              `The revision #${this.version} of the page named "${this.wikiLink.toPath()}" does not exist.`,
            '</div>'
        ];
        return lines.join('');
    }
}


abstract class WithVersionBody extends ContentBody {
    public constructor(wikiLink: WikiLink, private readonly version: number) {
        super(wikiLink);
    }

    public get html(): string {
        return this.versionAlert() + this.mainContent(this.version);
    }

    protected abstract mainContent(version: number): string;

    private versionAlert(): string {
        const history: WikiHistory = createHistory(this.wikiLink.namespace, this.wikiLink.type, true);
        const data: VersionData = history.getByVersion(this.wikiLink.name, this.version);
        const latestVersion: number = history.getByName(this.wikiLink.name).version;
        const lines: string[] = [
            '<div class="alert alert-warning" role="alert">',
              'Revision as of ' + dateToStr(data.created),
              '<br>',
              this.revisionLine(data, latestVersion),
            '</div>',
        ];
        return lines.join('');
    }

    private revisionLine(data: VersionData, latestVersion: number): string {
        const DIFF: string = 'diff';
        const SEPARATOR: string = ' | ';
        const lines: string[] = []
        lines.push(this.oldRevisionLine(data, DIFF));
        lines.push(SEPARATOR);
        lines.push(this.latestRevisionLine(data, latestVersion, DIFF));
        lines.push(SEPARATOR);
        lines.push(this.newRevisionLine(data, DIFF));
        return lines.join('');
    }

    private oldRevisionLine(data: VersionData, DIFF: string): string {
        const OLD_VERSION: string = '← Older revision';
        const lines: string[] = [];
        if (data.prev !== null) {
            lines.push(this.surround(this.diffLink(this.version - 1, this.version, DIFF)));
            lines.push(' ');
            lines.push(this.versionLink(data.version - 1, OLD_VERSION));
        } else {
            lines.push(this.surround(DIFF));
            lines.push(' ');
            lines.push(OLD_VERSION);
        }
        return lines.join('');
    }

    private latestRevisionLine(data: VersionData, latestVersion: number, DIFF: string): string {
        const LATEST_VERSION: string = 'Latest revision';
        const lines: string[] = [];
        if (data.next !== null) {
            lines.push(this.versionLink(latestVersion, LATEST_VERSION));
            lines.push(' ');
            lines.push(this.surround(this.diffLink(this.version, latestVersion, DIFF)));
        } else {
            lines.push(LATEST_VERSION);
            lines.push(' ');
            lines.push(this.surround(DIFF));
        }
        return lines.join('');
    }

    private newRevisionLine(data: VersionData, DIFF: string): string {
        const lines: string[] = [];
        const NEW_VERSION: string = 'Newer revision →';
        if (data.next !== null) {
            lines.push(this.versionLink(data.version + 1, NEW_VERSION));
            lines.push(' ');
            lines.push(this.surround(this.diffLink(this.version, this.version + 1, DIFF)));
        } else {
            lines.push(NEW_VERSION);
            lines.push(' ');
            lines.push(this.surround(DIFF));
        }
        return lines.join('');
    }

    private versionLink(version: number, text: string): string {
        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('version', String(version));
        return `<a href="${location.toURI()}">${text}</a>`;
    }

    private surround(text: string): string {
        return '(' + text + ')';
    }

    private diffLink(old: number, diff: number, text: string): string {
        const href: string = PageDiffBody.createURI(this.wikiLink, old, diff);
        return `<a href="${href}">${text}</a>`;
    }
}


export {NotFoundVersionBody, WithVersionBody};
