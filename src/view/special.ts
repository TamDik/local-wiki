function dispatchWikiActionSpecial(controller: WikiController, wikiNS: string, wikiName: string, wikiAction: WikiAction): IContentView {
    const specialViews: Map<string, SpecialView> = new Map([
        ['AllPages', new AllPagesView(controller)],
        ['UploadFile', new UploadFileView(controller)],
        ['AllFiles', new AllFilesView(controller)]
    ]);
    specialViews.set('SpecialPages', new SpecialPagesView(controller, specialViews));

    const view: SpecialView | undefined = specialViews.get(wikiName);
    if (view) {
        return view;
    }
    return new NotFoundSpecialView(controller);
}


type SpecialPageCategory = 'LIST_OF_PAGES' | 'MEDIA_REPORT_AND_UPLOAD' | 'OTHER';
abstract class SpecialView implements IContentView {
    public constructor(protected readonly controller: WikiController) {
    }

    // スペシャルページの説明
    public abstract description: string;

    public categoryKey: SpecialPageCategory = 'OTHER';

    // カテゴリごとの説明
    protected categoryToDescription(key: SpecialPageCategory): string {
        switch (key) {
            case 'LIST_OF_PAGES':
                return 'Lists of pages';
            case 'MEDIA_REPORT_AND_UPLOAD':
                return 'Media reports and uploads';
            case 'OTHER':
                return 'Others';
        }
    }

    public abstract update(): void;
}


class NotFoundSpecialView extends SpecialView {
    public description: string = 'Not found page';

    public update(): void {
        const lines: string[] = [];
        const href: string = 'Special:SpecialPages';
        lines.push('<h1>No such special page</h1>');
        lines.push('<p><b>You have requested an invalid special page.</b></p>');
        lines.push(`<p>A list of valid special pages can be found at <a href="${href}" class="internal-link">Special pages</a>.</p>`);
        lines.push('<p>Return to <a href="index" class="internal-link">Home</a>.</p>');
        this.controller.$mainContentWrapper.append(lines.join(''));
    }
}


class AllPagesView extends SpecialView {
    public description: string = 'All pages';
    public categoryKey: SpecialPageCategory = 'LIST_OF_PAGES';

    public update(): void {
        this.controller.$mainContentWrapper.append('all pages');
    }
}


class AllFilesView extends SpecialView {
    public description: string = 'File list';
    public categoryKey: SpecialPageCategory = 'MEDIA_REPORT_AND_UPLOAD';

    public update(): void {
        this.controller.$mainContentWrapper.append('all files');
    }
}


class SpecialPagesView extends SpecialView {
    public description: string = 'Special pages';
    constructor(controller: WikiController, private specialViewMap: Map<string, SpecialView>) {
        super(controller);
    }

    public update(): void {
        const $div: JQuery = $('<div>');
        this.appendCategory($div, 'LIST_OF_PAGES');
        this.appendCategory($div, 'MEDIA_REPORT_AND_UPLOAD');
        this.appendCategory($div, 'OTHER');
        this.controller.$mainContentWrapper.append($div);
    }

    private appendCategory($wrapper: JQuery, categoryKey: SpecialPageCategory): void {
        $wrapper.append(`<h2>${this.categoryToDescription(categoryKey)}</h2>`);
        const $ul: JQuery = $('<ul>');
        for (const [wikiName, view] of this.specialViewMap.entries()) {
            if (view.categoryKey !== categoryKey) {
                continue;
            }
            const $li: JQuery = $(`<li><a href="Special:${wikiName}" class="internal-link">${view.description}</a></li>`);
            $ul.append($li);
        }
        $wrapper.append($ul);
    }
}


class UploadFileView extends SpecialView {
    public categoryKey: SpecialPageCategory = 'MEDIA_REPORT_AND_UPLOAD';
    public description: string = 'Upload file';

    public update(): void {
        this.controller.$mainContentWrapper.append('upload');
    }
}
