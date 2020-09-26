function dispatchWikiActionTemplate(controller: WikiController, wikiNS: string, wikiName: string, wikiAction: WikiAction): IContentView {
    return new TemplateView();
}

class TemplateView implements IContentView {
    public update(): void {
    }
}
