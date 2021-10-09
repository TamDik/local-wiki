import {WikiLinkCollectable, ReferenceType} from './markdown';
import {WikiLink} from './wikilink';


// history.jsonに追加
type ReferingWikiLinkData = {
    namespace?: string,  /* 参照されているそのままの状態で記録したい */
    type: WikiType,
    name: string
};
type ReferingData = {
    links: ReferingWikiLinkData[],
    medias: ReferingWikiLinkData[],
    templates: ReferingWikiLinkData[],
    categories: ReferingWikiLinkData[]
};


class ReferenceCollector implements WikiLinkCollectable {
    private readonly reference: {link: string[], media: string[], template: string[], category: string[]};

    public constructor(private readonly baseNamespace: string) {
        this.reference = {link: [], media: [], template: [], category: []};
    }

    public addWikiLink(href: string, type: ReferenceType): void {
        const wikiLink: WikiLink = new WikiLink(href, this.baseNamespace);
        if (type === 'template' && wikiLink.type !== 'Template') {
            return;
        }
        if (type === 'category' && wikiLink.type !== 'Category') {
            return;
        }
        for (const reference of this.reference[type]) {
            const wl: WikiLink = new WikiLink(reference, this.baseNamespace);
            if (wl.equals(wikiLink)) {
                return;
            }
        }
        this.reference[type].push(href);
    }

    public getLinks(): string[] {
        return this.reference.link;
    }

    public getMedias(): string[] {
        return this.reference.media;
    }

    public getTemplates(): string[] {
        return this.reference.template;
    }

    public getCategories(): string[] {
        return this.reference.category;
    }
}


export {ReferenceCollector};
