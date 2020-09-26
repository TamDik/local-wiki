type WikiType = 'Main' | 'Template' | 'File' | 'Special';
type WikiAction = 'view' | 'edit' | 'history';/* | 'revert' | 'raw' | 'delete' */

function isWikiAction(arg: any): arg is WikiAction {
    return ['view', 'edit', 'history'].includes(arg);
}

interface IContentView {
    update(): void;
}

class MainInputArea {
    public readonly $object: JQuery;
    constructor(selector: string, private readonly controller: WikiController) {
        this.$object = $(selector);

        this.$object.on('keypress', event => {
            if (event.which == 13) {
                this.pathInputEnterAction();
            }
        });
    }

    private pathInputEnterAction(): void {
        try {
            const val: string = <string>this.$object.val();
            const wikiLocation: WikiLocation = parseWikiLocation(val);
            const wikiAction: WikiAction = 'view';
            this.controller.change({wikiLocation, wikiAction});
        } catch (e) {
        }
    }
}

class NavTab {
    public transitionFeasible: () => Promise<boolean> = async () => true;
    public readonly $object: JQuery;
    private active_: boolean = true;
    constructor(text: string, selector: string) {
        this.$object = $(selector);
        this.text = text;
        this.$object.on('click', event => {
        });
    }

    public set text(val: string) {
        this.$object.html(val);
    }

    public get text(): string {
        return this.$object.html();
    }

    public set active(val: boolean) {
        this.active_ = val;
        if (this.active_) {
            this.$object.addClass('active');
        } else {
            this.$object.removeClass('active');
        }
    }

    public hide(): void {
        this.$object.addClass('d-none');
    }

    public show(): void {
        this.$object.removeClass('d-none');
    }
}


class WikiController {
    public readonly $mainContentWrapper: JQuery;
    private wikiLocation: WikiLocation = {wikiNS: 'Wiki', wikiType: 'Main', wikiName: 'index'};
    private wikiAction: WikiAction = 'view';
    private inputArea: MainInputArea;
    private tabs = {
        page:    new NavTab(this.wikiName, '#main-tab'),
        read:    new NavTab('Read',        '#read-tab'),
        edit:    new NavTab('Edit',        '#edit-tab'),
        history: new NavTab('History',     '#history-tab')
    };

    public constructor(parentSelector: string) {
        this.$mainContentWrapper = $(parentSelector);
        this.inputArea = new MainInputArea('#wiki-path-input', this);
        this.update();
    }

    private get wikiNS(): string {
        return this.wikiLocation.wikiNS;
    }

    private get wikiType(): WikiType {
        return this.wikiLocation.wikiType;
    }

    private get wikiName(): string {
        return this.wikiLocation.wikiName;
    }

    public change({wikiLocation=this.wikiLocation, wikiAction=this.wikiAction}:
                  {wikiLocation?: WikiLocation, wikiAction?: WikiAction}): void {
        this.wikiLocation = wikiLocation;
        this.wikiAction = wikiAction;
        this.update();
    }

    private update(): void {
        this.updateMainContent();
        this.updateTabs();
    }

    private updateMainContent(): void {
        const contentView: IContentView = this.dispatchWikiType();
        this.$mainContentWrapper.empty();
        contentView.update();
    }

    private dispatchWikiType(): IContentView {
        switch (this.wikiType) {
            case 'Main':
                return dispatchWikiActionMain(this, this.wikiNS, this.wikiName, this.wikiAction);
            case 'Template':
                return dispatchWikiActionTemplate(this, this.wikiNS, this.wikiName, this.wikiAction);
            case 'File':
                return dispatchWikiActionFile(this, this.wikiNS, this.wikiName, this.wikiAction);
            case 'Special':
                return dispatchWikiActionSpecial(this, this.wikiNS, this.wikiName, this.wikiAction);
        }
    }

    private updateTabs(): void {
        switch (this.wikiAction) {
            case 'view':
                this.tabs.read.active = true;
                this.tabs.edit.active = false;
                this.tabs.history.active = false;
                break;
            case 'edit':
                this.tabs.read.active = false;
                this.tabs.edit.active = true;
                this.tabs.history.active = false;
                break;
            case 'history':
                this.tabs.read.active = false;
                this.tabs.history.active = true;
                this.tabs.history.active = false;
                break;
        }

        if (this.wikiType === 'Special') {
            this.tabs.edit.hide();
            this.tabs.history.hide();
        } else {
            this.tabs.edit.show();
            this.tabs.history.show();
        }

        if (this.wikiNS === 'Wiki') {
            this.tabs.page.text = this.wikiName;
        } else {
            this.tabs.page.text = this.wikiNS + ':' + this.wikiName;
        }
    }
}


jQuery(() => {
    const $document: JQuery<Document> = $(document);
    const controller: WikiController = new WikiController('#main-content-wrapper');

    $document.on('click', 'a', event => {
        event.preventDefault();
    });

    $document.on('click', '.external-link', event => {
    });

    $document.on('click', '.internal-link', event => {
    });
});
