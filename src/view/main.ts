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
        IpcAdapter.getPageText(this.wikiNS, this.wikiName)
        .then(text => {
            if (typeof(text) === 'string') {
                const main: HTMLElement = wikimdToElement(text, 3);
                this.$parent.append(main);
            } else {
                this.updateAsNotFoundView();
            }
        });
    }

    private updateAsNotFoundView(): void {
        const lines: string[] = [];
        const href: string = '?action=edit';
        const msg1: string = 'There is currently no text in this page.';
        lines.push('<div class="alert alert-warning" id="not-found-page-alert" role="alert">');
        lines.push(`${msg1} You can <a href="${href}" class="internal-link alert-link">create this page</a>.`);
        lines.push('</div>');
        this.$parent.append(lines.join(''));
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
