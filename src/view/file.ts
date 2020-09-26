function dispatchWikiActionFile(controller: WikiController, wikiNS: string, wikiName: string, wikiAction: WikiAction): IContentView {
    return new FileView();
}

class FileView implements IContentView {
    public update(): void {
    }
}
