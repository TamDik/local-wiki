function dispatchWikiActionMain(controller: WikiController, wikiNS: string, wikiName: string, wikiAction: WikiAction): IContentView {
    const $parent: JQuery = controller.$mainContentWrapper;
    switch (wikiAction) {
        case 'view':
            return new MainViewView($parent, wikiNS, wikiName);
        case 'edit':
            return new MainEditView(controller, wikiNS, wikiName);
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

class MainHistoryView implements IContentView{
    public constructor(private $parent: JQuery, private wikiNS: string, private wikiName: string) {
    }
    public update(): void {
    }
}
