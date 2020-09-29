function dispatchWikiActionSpecial(controller: WikiController, wikiNS: string, wikiName: string, wikiAction: WikiAction): IContentView {
    const specialViews: Map<string, SpecialView> = new Map();
    specialViews.set('AllPages', new AllPagesView(controller, wikiNS));
    specialViews.set('UploadFile', new UploadFileView(controller, wikiNS));
    specialViews.set('AllFiles', new AllFilesView(controller, wikiNS));
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


// ページ一覧
class AllPagesView extends SpecialView {
    public description: string = 'All pages';
    public categoryKey: SpecialPageCategory = 'LIST_OF_PAGES';

    constructor(controller: WikiController, private wikiNS: string) {
        super(controller);
    }

    public update(): void {
        // TODO 絞り込み
        this.appendPageList();
    }

    private appendPageList(): void {
        IpcAdapter.getNameList(this.wikiNS, 'Main')
        .then(nameList => {
            console.log(nameList);
            const lines: string[] = [];
            lines.push('<div class="all-pages-body"><ul>');
            for (const pageName of nameList) {
                lines.push(`<li>`);
                lines.push(`<a href="${this.wikiNS}:${pageName}" class="internal-link">${pageName}</a>`);
                lines.push(`</li>`);
            }
            lines.push('</ul></div>');
            this.controller.$mainContentWrapper.append(lines.join(''));
        });
    }
}


// ファイル一覧
class AllFilesView extends SpecialView {
    public description: string = 'File list';
    public categoryKey: SpecialPageCategory = 'MEDIA_REPORT_AND_UPLOAD';

    constructor(controller: WikiController, private wikiNS: string) {
        super(controller);
    }

    public update(): void {
        this.controller.$mainContentWrapper.append('<p>This special page shows all uploaded files.</p>');
        this.appendFileList();
    }

    // IDEA: サムネイル
    private appendFileList(): void {
        IpcAdapter.getNameList(this.wikiNS, 'File')
        .then(nameList => {
            const lines: string[] = [];
            lines.push('<div class="all-files-body"><ul>');
            for (const fileName of nameList) {
                lines.push(`<li>`);
                lines.push(`<a href="${this.wikiNS}:File:${fileName}" class="internal-link">${fileName}</a>`);
                lines.push(`</li>`);
            }
            lines.push('</ul></div>');
            this.controller.$mainContentWrapper.append(lines.join(''));
        });
    }
}


// スペシャルページ一覧
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


// ファイルのアップロード
class UploadFileView extends SpecialView {
    public categoryKey: SpecialPageCategory = 'MEDIA_REPORT_AND_UPLOAD';
    public description: string = 'Upload file';

    private filepath: string = '';
    private readonly NO_FILE_CHOSEN: string = 'No file chosen';

    private $file: JQuery;
    private $filename: JQuery;
    private $comment: JQuery;
    private $uploadButton: JQuery;
    private $chosenFileLabel: JQuery;

    public constructor(controller: WikiController, private wikiNS: string) {
        super(controller);
        this.$file = $('<button class="form-control btn btn-outline-secondary" id="source-file">').html('Choose File');
        this.$filename = $('<input type="text" class="form-control" id="destination-filename" placeholder="Filename">');
        this.$comment = $('<input type="text" class="form-control" id="upload-comment" placeholder="Comment">')
        this.$uploadButton = $('<button type="submit" class="btn btn-outline-primary">Upload file</button>');
        this.$chosenFileLabel = $('<label for="source-file" class="form-control" id="chosen-file">').html(this.NO_FILE_CHOSEN);
    }

    private extentions: Map<FileType, string[]> = new Map([
        ['image', ['png', 'jpg', 'jpeg', 'gif']],
        ['pdf', ['pdf']],
        ['page', ['markdown', 'md']]
    ]);

    private get permittedExtentions(): string[] {
        const permittedExtentions: string[] = [];
        for (const extentions of this.extentions.values()) {
            permittedExtentions.push(...extentions);
        }
        return permittedExtentions;
    }

    public update(): void {
        const filetypes: string = this.permittedExtentions.join(', ');

        const $form1: JQuery = $('<div class="form-group">').append(
            '<label for="source-file">Source filename: </label>',
            $('<div class="input-group">').append(
                $('<div class="input-group-prepend">').append(this.$file),
                $('<div class="input-group-append">').append(this.$chosenFileLabel)
            ),
            `<small class="form-text text-muted">Permitted file types: ${filetypes}.</small>`
        );

        const $form2: JQuery = $('<div class="form-group">').append(
            '<label for="destination-filename">Destination filename: </label>', this.$filename
        );

        const $form3: JQuery = $('<div class="form-group">').append(
            '<label for="upload-comment">Comment: </label>', this.$comment
        );

        const $wrapper: JQuery = $('<div class="border rounded p-3">').append(
            $form1, $form2, $form3, this.$uploadButton
        );

        this.setEvent();
        this.controller.$mainContentWrapper.append($wrapper);
    }

    private setEvent(): void {
        this.setChooseFileAction();
        this.setUploadFileEvent();
    }

    private setChooseFileAction(): void {
        this.$file.on('click', event => {
            window.dialog.showOpenDialog({properties: ['openFile']})
            .then((result: {canceled: boolean, filePaths: string[]}) => {
                if (result.canceled || result.filePaths.length !== 1) {
                    this.filepath = '';
                    this.$chosenFileLabel.html(this.NO_FILE_CHOSEN);
                } else {
                    const filename: string = result.filePaths[0];
                    const extention: string = filename.replace(/^.*\./, '');
                    if (!this.permittedExtentions.includes(extention)) {
                        this.filepath = '';
                        this.$chosenFileLabel.html(this.NO_FILE_CHOSEN);
                        alert('Invalid file extention');
                        return;
                    }
                    this.filepath = filename;
                    this.$chosenFileLabel.html(filename);
                }
            });
        });
    }

    private setUploadFileEvent(): void {
        this.$uploadButton.on('click', event => {
            if (this.filepath === '') {
                alert('No file chosen. Choose a file.');
                return;
            }
            const filename: string = <string>this.$filename.val();
            const comment: string = <string>this.$comment.val();
            if (filename === '') {
                alert('The destination filename is empty.');
                return;
            }
            IpcAdapter.uploadFile(this.wikiNS, filename, this.filepath, comment)
            .then(success => {
                if (success) {
                    const wikiLocation: WikiLocation = {wikiNS: this.wikiNS, wikiType: 'File', wikiName: filename};
                    this.controller.change({wikiLocation});
                }
            });
        });
    }
}
