import {createHistory, WikiHistory} from '../wikihistory-builder';
import {WikiLink} from '../wikilink';


abstract class ContentBody {
    public abstract html: string;
    public css: string[] = [];
    public js: string[] = [];

    public constructor(protected readonly wikiLink: WikiLink) {
    }

    public applyParamerters(parameters: {[key: string]: string}): void {
    }
}

interface IContentBodyDispatcher {
    execute(): ContentBody;
}


abstract class ContentBodyDispatcher implements IContentBodyDispatcher {
    public constructor(private readonly wikiLink: WikiLink, private readonly mode: PageMode, private readonly version: number|undefined) {
    }

    public execute(): ContentBody {
        const history: WikiHistory = createHistory(this.wikiLink.namespace, this.wikiLink.type);
        if (!history.hasName(this.wikiLink.name)) {
            return this.dispatchNotFoundContentBody();
        }

        if (typeof(this.version) === 'undefined') {
            return this.dispatchContentBody();
        }

        if (this.existsVersion(this.version)) {
            return this.contentWithVersionBody(this.wikiLink, this.version);

        } else {
            return this.notFoundContentWithVersionBody(this.wikiLink, this.version);
        }
    }

    private dispatchContentBody(): ContentBody {
        switch (this.mode) {
            case 'read':
                return this.readContentBody(this.wikiLink);
            case 'edit':
                return this.editContentBody(this.wikiLink);
            case 'history':
                return this.historyContentBody(this.wikiLink);
        }
    }

    private dispatchNotFoundContentBody(): ContentBody {
        switch (this.mode) {
            case 'read':
                return this.notFoundReadContentBody(this.wikiLink);
            case 'edit':
                return this.notFoundEditContentBody(this.wikiLink);
            case 'history':
                return this.notFoundHistoryContentBody(this.wikiLink);
        }
    }

    protected existsVersion(version: number): boolean {
        const history: WikiHistory = createHistory(this.wikiLink.namespace, this.wikiLink.type, true);
        const name: string = this.wikiLink.name;
        if (!history.hasName(name)) {
            return false;
        }
        return version > 0 && version <= history.getByName(name).version;
    }

    protected abstract readContentBody(wikiLink: WikiLink): ContentBody;

    protected editContentBody(wikiLink: WikiLink): ContentBody {
        return this.readContentBody(wikiLink);
    }
    protected historyContentBody(wikiLink: WikiLink): ContentBody {
        return this.readContentBody(wikiLink);
    }
    protected contentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody {
        return this.readContentBody(wikiLink);
    }

    protected abstract notFoundReadContentBody(wikiLink: WikiLink): ContentBody;

    protected notFoundEditContentBody(wikiLink: WikiLink): ContentBody {
        return this.notFoundReadContentBody(wikiLink);
    }
    protected notFoundHistoryContentBody(wikiLink: WikiLink): ContentBody {
        return this.notFoundReadContentBody(wikiLink);
    }

    protected abstract notFoundContentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody;
}


export {ContentBody, IContentBodyDispatcher, ContentBodyDispatcher};
