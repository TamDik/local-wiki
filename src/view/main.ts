function dispatchWikiActionMain(controller: WikiController, wikiNS: string, wikiName: string, wikiAction: WikiAction): IContentView {
    const $parent: JQuery = controller.$mainContentWrapper;
    switch (wikiAction) {
        case 'view':
            return new MainViewView($parent, wikiNS, wikiName);
        case 'edit':
            return new MainEditView(controller, wikiNS, wikiName);
        case 'history':
            return new MainHistoryView(controller, wikiNS, wikiName);
    }
}


class MainViewView implements IContentView {
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
        lines.push('<div class="alert alert-warning" role="alert">');
        lines.push(`${msg1} You can <a href="${href}" class="internal-link alert-link">create this page</a>.`);
        lines.push('</div>');
        this.$parent.append(lines.join(''));
    }
}


class MainEditView implements IContentView {
    private markdownBeforeChange: string = '';
    private $previewAlert: JQuery;
    private $markdownPreview: JQuery;
    private $forms: {comment: JQuery, markdown: JQuery}
    private $buttons: {save: JQuery, preview: JQuery, reset: JQuery};

    public constructor(private controller: WikiController, private wikiNS: string, private wikiName: string) {
        this.$previewAlert = this.createPreviewAlert();
        this.$markdownPreview = $('<div class="col-12" id="markdown-preview">');
        this.$forms = {
            comment: $('<input type="text" class="form-control" id="article-edit-comment" placeholder="Comment">'),
            markdown: $('<textarea class="form-control" id="markdown-edit-form">')
        }
        this.$buttons = {
            save: this.createButton('primary', 'Save', true),
            preview: this.createButton('outline-secondary', 'Preview', false),
            reset: this.createButton('outline-danger', 'Reset', true)
        }
    }

    private get $parent(): JQuery {
        return this.controller.$mainContentWrapper;
    }

    private createPreviewAlert(): JQuery {
        const $alert: JQuery = $(`
            <div class="alert alert-warning d-none" id="preview-alert" role="alert">
                <strong>Remember that this is only a preview.</strong>
                Your changes have not yet been saved! <a href="#markdown-edit-form"> → Go to editing area</a>
            </div>`);
        return $alert;
    }

    private createButton(btnType: 'primary'|'outline-secondary'|'outline-danger', text: string, disabled: boolean): JQuery {
        const $button = $(`<button type="button" class="btn btn-${btnType} btn-block">`)
                        .prop('disabled', disabled)
                        .html(text);
        return $button;
    }

    public update(): void {
        const $markdownPreviewRow: JQuery = $('<div class="row">').append(this.$markdownPreview);
        const $editFormRow: JQuery = $('<div class="row mb-2">').append(
            $('<div class="col-12">').append(this.$forms.markdown)
        );
        const $commentFormRow: JQuery = $('<div class="row mb-2">').append(
            $('<div class="col-12">').append(this.$forms.comment)
        );
        const $buttonsRow: JQuery = $('<div class="row">').append(
            $('<div class="col-2 offset-3">').append(this.$buttons.save),
            $('<div class="col-2">').append(this.$buttons.preview),
            $('<div class="col-2">').append(this.$buttons.reset)
        );

        this.setEvents();
        this.setMarkdownBeforeChange();
        this.$parent.append(this.$previewAlert, $markdownPreviewRow, $editFormRow, $commentFormRow, $buttonsRow);
    }

    private setEvents(): void {
        this.$forms.markdown.on('input', event => {
            this.updateButtons();
        });

        this.$buttons.save.on('click', event => {
            const markdown: string = <string>this.$forms.markdown.val();
            const comment: string = <string>this.$forms.comment.val();
            IpcAdapter.editPage(this.wikiNS, this.wikiName, markdown, comment)
            .then(success => {
                if (success) {
                    this.controller.change({wikiAction: 'view'});
                } else {
                    alert('Error occurred while saving your changes.');
                }
            });
        });

        this.$buttons.preview.on('click', event => {
            const markdown: string = <string>this.$forms.markdown.val();
            const element: HTMLElement = wikimdToElement(markdown, 3);
            this.$markdownPreview.html(element);
            this.$previewAlert.removeClass('d-none');
        });

        this.$buttons.reset.on('click', event => {
            this.$previewAlert.addClass('d-none');
            this.$markdownPreview.html('');
            this.$forms.markdown.val(this.markdownBeforeChange);
            this.$forms.comment.val('');
            this.updateButtons();
        });
    }

    private updateButtons(): void {
        const markdown: string = <string>this.$forms.markdown.val();
        const changed: boolean = markdown !== this.markdownBeforeChange;
        this.$buttons.save.prop('disabled', !changed);
        this.$buttons.reset.prop('disabled', !changed);
    }

    private setMarkdownBeforeChange(): void {
        IpcAdapter.getPageText(this.wikiNS, this.wikiName)
        .then(text => {
            if (text === null) {
                return;
            }
            this.markdownBeforeChange = text;
            this.$forms.markdown.val(text);
        });
    }
}


class MainHistoryView implements IContentView {
    private readonly numOfParSession: number = 30;
    private historyList: HistoryList = new HistoryList();
    private codeTable = {
        diff: new DiffCodeTable(),
        view: new ViewCodeTable()
    };
    private $wrapper: JQuery;
    private $toggleButton: JQuery;
    private $historyList: JQuery;
    private $nextButton: JQuery;

    public constructor(private readonly controller: WikiController, private wikiNS: string, private wikiName: string) {
        this.$toggleButton = $('<span class="pointable history-mode-toggle">diff</span>');
        this.$historyList = $('<div class="col-12">');
        this.$nextButton = $('<button type="button" class="btn btn-outline-primary btn-block">').html('next historical data');
        this.historyList.appendTo(this.$historyList);
        this.$wrapper = $('<div class="row">');
    }

    public update(): void {
        this.controller.$mainContentWrapper.append(this.$wrapper);

        const $historyList: JQuery = $('<div class="col-12 col-xl-4">').append(
            $('<div class="row">').append(
                $('<div class="col-12">').append(
                    'mode (diff | view): ',
                    this.$toggleButton
                )
            ),
            $('<div class="row">').append(this.$historyList),
            $('<div class="row">').append(
                $('<div class="col-4 col-xl-12">').append(this.$nextButton)
            )
        );
        const $codeTableWrapper: JQuery = $('<div class="col-12 col-xl-8">');
        this.codeTable.diff.appendTo($codeTableWrapper);
        this.codeTable.view.appendTo($codeTableWrapper);
        this.$wrapper.append($historyList, $codeTableWrapper);
        this.updateHistoryList(0)
        .then(() => {
            this.updateCodeTables();
        });
        this.setEvents();
    }

    private setEvents(): void {
        this.$toggleButton.on('click', event => {
            const fromView: boolean = $(event.currentTarget).html() === 'view';
            if (fromView) {
                this.$toggleButton.html('diff');
                this.historyList.setMode('diff');
            } else {
                this.$toggleButton.html('view');
                this.historyList.setMode('view');
            }
            this.updateCodeTables();
        });

        this.$nextButton.on('click', event => {
            const lastPage: HistoricalData | null = this.historyList.lastHistoricalData;
            if (lastPage === null) {
                return;
            }
            if (lastPage.prev === null) {
                return;
            }
            this.updateHistoryList(lastPage.version - 1);
        });

        this.historyList.checked(this.updateCodeTables.bind(this));
    }

    private async updateHistoryList(maxVersion: number): Promise<void> {
        const params: [string, string, number, number] = [this.wikiNS, this.wikiName, this.numOfParSession, maxVersion];
        const dataList: HistoricalData[] = await IpcAdapter.getHistoricalPageData(...params);
        for (const data of dataList) {
            this.historyList.add(data);
        }
        const lastPage: HistoricalData | null = this.historyList.lastHistoricalData;
        if (lastPage === null || lastPage.prev === null) {
            this.$nextButton.prop('disabled', true)
        }
    }

    private updateCodeTables(): void {
        if (this.historyList.getMode() === 'diff') {
            this.updateDiffCodeTable();
            this.codeTable.diff.show();
            this.codeTable.view.hide();
        } else {
            this.updateViewCodeTable();
            this.codeTable.diff.hide();
            this.codeTable.view.show();
        }
    }

    private updateDiffCodeTable(): void {
        const oldData: HistoricalData|null = this.historyList.old;
        const diffData: HistoricalData|null = this.historyList.diff;
        let p1: Promise<string | null> | null;
        let p2: Promise<string | null> | null;
        p1 = oldData === null ? null : IpcAdapter.getPageText(this.wikiNS, this.wikiName, oldData.version);
        p2 = diffData === null ? null : IpcAdapter.getPageText(this.wikiNS, this.wikiName, diffData.version);
        Promise.all([p1, p2])
        .then(([text1, text2]) => {
            this.codeTable.diff.setCodeAfterChange(text2);
            this.codeTable.diff.setCodeBeforeChange(text1);
            this.codeTable.diff.update();
        });
    }

    private updateViewCodeTable(): void {
        const data: HistoricalData | null = this.historyList.view;
        let p: Promise<string | null> | null;
        p = data === null ? null : IpcAdapter.getPageText(this.wikiNS, this.wikiName, data.version);
        Promise.all([p])
        .then(([text]) => {
            if (text === null) {
                this.codeTable.view.setCode('');
            } else {
                this.codeTable.view.setCode(text);
            }
            this.codeTable.view.update();
        });
    }
}
