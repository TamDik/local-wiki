type ReferenceType = 'link'|'media'|'template'|'category';


interface WikiLinkCollectable {
    addWikiLink(href: string, type: ReferenceType): void;
}


abstract class WikiLinkFinder {
    protected collectors: WikiLinkCollectable[] = [];
    public addCollector(collector: WikiLinkCollectable): void {
        this.collectors.push(collector);
    }

    public foundWikiLink(href: string, type: ReferenceType): void {
        for (const collector of this.collectors) {
            collector.addWikiLink(href, type);
        }
    }
}


export {WikiLinkCollectable, WikiLinkFinder, ReferenceType};
