function dispatchWikiActionMain(controller: WikiController, wikiNS: string, wikiName: string, wikiAction: WikiAction): IContentView {
    const $parent: JQuery = controller.$mainContentWrapper;
    switch (wikiAction) {
        case 'view':
            return new MainViewView($parent, wikiNS, wikiName);
        case 'edit':
            return new MainEditView($parent, wikiNS, wikiName);
        case 'history':
            return new MainHistoryView($parent, wikiNS, wikiName);
    }
}

class MainViewView implements IContentView{
    public constructor(private $parent: JQuery, private wikiNS: string, private wikiName: string) {
    }
    public update(): void {
    }
}

class MainEditView implements IContentView{
    public constructor(private $parent: JQuery, private wikiNS: string, private wikiName: string) {
    }

    public update(): void {
    }

}

class MainHistoryView implements IContentView{
    public constructor(private $parent: JQuery, private wikiNS: string, private wikiName: string) {
    }
    public update(): void {
    }
}
