function dispatchWikiActionSpecial(controller: WikiController, wikiNS: string, wikiName: string, wikiAction: WikiAction): IContentView {
    return new SpecialView();
}

class SpecialView implements IContentView {
    public update(): void {
    }
}
