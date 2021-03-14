(() => {
    const mdTextArea: HTMLTextAreaElement = document.getElementById('markdown-edit-area') as HTMLTextAreaElement;
    const commentArea: HTMLInputElement = document.getElementById('comment-edit-area') as HTMLInputElement;
    const params: Params = new Params();
    let mde: SimpleMDE|null = null;
    const shortcuts: SimpleMDE.ShortcutsArray = {
        'toggleBlockquote': null,
        'toggleBold': null,
        'cleanBlock': null,
        'toggleHeadingSmaller': null,
        'toggleItalic': null,
        'drawLink': null,
        'toggleUnorderedList': null,
        'togglePreview': null,
        'toggleCodeBlock': null,
        'drawImage': null,
        'toggleOrderedList': null,
        'toggleHeadingBigger': null,
        'toggleSideBySide': null,
        'toggleFullScreen': null,
    };
    const toolbar: boolean|Array<string|SimpleMDE.ToolbarIcon> = [
        {
            name: "bold",
            action: SimpleMDE.toggleBold,
            className: "fa fa-bold",
            title: "Bold",
        },
        {
            name: "italic",
            action: SimpleMDE.toggleItalic,
            className: "fa fa-italic",
            title: "Italic",
        },
        {
            name: "strikethrough",
            action: SimpleMDE.toggleStrikethrough,
            className: "fa fa-strikethrough",
            title: "Strikethrough"
        },
        {
            name: "heading",
            action: SimpleMDE.toggleHeadingSmaller,
            className: "fa fa-header",
            title: "Heading",
        },
        "|",
        {
            name: "code",
            action: SimpleMDE.toggleCodeBlock,
            className: "fa fa-code",
            title: "Code"
        },
        {
            name: "quote",
            action: SimpleMDE.toggleBlockquote,
            className: "fa fa-quote-left",
            title: "Quote",
        },
        {
            name: "unordered-list",
            action: SimpleMDE.toggleUnorderedList,
            className: "fa fa-list-ul",
            title: "Generic List",
        },
        {
            name: "ordered-list",
            action: SimpleMDE.toggleOrderedList,
            className: "fa fa-list-ol",
            title: "Numbered List",
        },
        {
            name: "clean-block",
            action: SimpleMDE.cleanBlock,
            className: "fa fa-eraser fa-clean-block",
            title: "Clean block"
        },
        "|",
        {
            name: "link",
            action: SimpleMDE.drawLink,
            className: "fa fa-link",
            title: "Create Link",
        },
        {
            name: "image",
            action: SimpleMDE.drawImage,
            className: "fa fa-picture-o",
            title: "Insert Image",
        },
        {
            name: "table",
            action: SimpleMDE.drawTable,
            className: "fa fa-table",
            title: "Insert Table"
        },
        {
            name: "horizontal-rule",
            action: SimpleMDE.drawHorizontalRule,
            className: "fa fa-minus",
            title: "Insert Horizontal Line"
        },
        '|',
        {
            name: "undo",
            action: SimpleMDE.undo,
            className: "fa fa-undo no-disable",
            title: "Undo"
        },
        {
            name: "redo",
            action: SimpleMDE.redo,
            className: "fa fa-repeat no-disable",
            title: "Redo"
        }
    ];

    function getText(): string {
        if (mde === null) {
            return mdTextArea.value;
        }
        return mde.value();
    }

    async function updatePage(): Promise<boolean> {
        const text: string = getText();
        const comment: string = commentArea.value;
        const section: string = params.getValueOf('section');
        if (window.utils.isNonNegativeNumber(section)) {
            return window.ipcApi.updatePage(params.path, text, comment, Number(section))
        } else {
            return window.ipcApi.updatePage(params.path, text, comment)
        }
    }

    const saveButton: HTMLButtonElement = document.getElementById('page-edit-save-button') as HTMLButtonElement;
    saveButton.addEventListener('click', () => {
        updatePage()
        .then(result => {
            location.href = window.localWiki.toURI(params.path);
        })
        .catch(e => {
        });
    }, false);


    const previewButton: HTMLButtonElement = document.getElementById('page-edit-preview-button') as HTMLButtonElement;
    const previewAlert: HTMLDivElement = document.getElementById('preview-alert') as HTMLDivElement;
    const previewWrapper: HTMLElement = document.getElementById('preview-wrapper') as HTMLElement;
    previewButton.addEventListener('click', () => {
        const markdown: string = getText();
        previewAlert.classList.remove('d-none');
        window.ipcApi.markdownToHtml(params.path, markdown)
        .then(html => {
            previewWrapper.innerHTML = html;
            View.update();
        });
    }, false);

    const goToEditArea: HTMLAnchorElement = document.getElementById('go-to-edit-area') as HTMLAnchorElement;
    goToEditArea.addEventListener('click', (event) => {
        event.preventDefault();
        let target: HTMLElement;
        if (mde === null) {
            target = mdTextArea;
        } else {
            target = mde.codemirror.display.wrapper;
        }
        const rect: DOMRect = target.getBoundingClientRect();
        scrollTo(0, rect.top);
    }, false);


    function setTextArea(simple: boolean): void {
        if (!simple && mde !== null) {
            mde.toTextArea();
            mde = null;
            return;
        }
        if (simple && mde === null) {
            mde = new SimpleMDE({
                element: mdTextArea,
                status: false,
                toolbar: toolbar,
                renderingConfig: {
                    singleLineBreaks: false,
                    codeSyntaxHighlighting: true,
                },
                shortcuts: shortcuts,
                spellChecker: false,
            });
            return;
        }
    }

    setTextArea(params.getValueOf('editor') === 'simple');
})();
