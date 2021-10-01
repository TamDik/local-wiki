class RichMDE {
    private emojiHelper: HTMLDivElement = document.createElement('div');
    public readonly element: HTMLDivElement = document.createElement('div');
    private readonly textareaSplit: {front: string, behind: string};
    private behindColon: string = '';

    public constructor(private readonly textarea: HTMLTextAreaElement) {
        const EMOJI_MARK = ':';

        this.emojiHelper.id = 'emoji-list';
        this.element.classList.add('rich-markdown-edit-area', 'form-control');
        this.element.contentEditable = 'true';
        this.textarea.hidden = true;
        this.textareaSplit = {front: this.textarea.value, behind: ''};
        this.updateInnerHTML();

        textarea.parentElement?.insertBefore(this.emojiHelper, textarea);
        textarea.parentElement?.insertBefore(this.element, textarea);

        this.element.addEventListener('input', async (event: any) => {
            const data: null | string = event.data;
            const {front, behind} = this.splitByCaret();
            if (data !== null && front.length !== this.textareaSplit.front.length + 1) {
                this.behindColon = '';
            }
            this.textareaSplit.front = front;
            this.textareaSplit.behind = behind;

            if (data === null) {

            } else if (data === ' ') {
                this.behindColon = '';
            } else if (data === EMOJI_MARK) {
                if (this.behindColon !== '' && this.behindColon !== ':' && await this.isEmoji(this.behindColon.substr(1))) {
                    this.behindColon = '';
                } else {
                    this.behindColon = EMOJI_MARK;
                }
            } else {
                if (this.behindColon !== '') {
                    this.behindColon += data;
                }
            }
            this.updateStyle();
        }, false);

        this.element.addEventListener('keydown', event => {
            const keyCode: number = event.keyCode;
            const H_CODE: 72 = 72;
            const BACKSPACE_CODE: 8 = 8;
            const ENTER_CODE: 13 = 13;
            const TAB_CODE: 9 = 9;
            if ((keyCode === BACKSPACE_CODE) || (keyCode === H_CODE && event.ctrlKey)) {
                const selected: string = (window.getSelection() as Selection).toString();
                const sliceLength: number = this.behindColon.length - Math.max(1, selected.length);
                this.behindColon = this.behindColon.slice(0, sliceLength);
            } else if (keyCode === ENTER_CODE) {
                this.behindColon = '';
            } else if (keyCode === TAB_CODE) {
                event.preventDefault();
                const {front, behind} = this.splitByCaret();
                this.textareaSplit.front = front;
                this.textareaSplit.behind = behind;
                const spaces: number = 4;
                this.insertText(' '.repeat(spaces));
                this.updateInnerHTML();
            }
        }, false);
    }

    public value(): string {
        return this.textareaSplit.front + this.textareaSplit.behind;
    }

    private async possibleEmojis(name: string): Promise<Map<string, string>> {
        const likeEmojis: Set<{name: string, html: string}> = await window.ipcApi.likeEmojis(name);
        const emojis: Map<string, string> = new Map();
        for (const emoji of likeEmojis) {
            emojis.set(':' + emoji.name + ':', emoji.html);
        }
        return emojis;
    }

    private async isEmoji(name: string): Promise<boolean> {
        const emojis: Map<string, string> = await this.possibleEmojis(name);
        if (emojis.size !== 1) {
            return false;
        }
        return emojis.has(this.behindColon);
    }

    private getCaretPosition(): DOMRect {
        const range: Range = (window.getSelection() as Selection).getRangeAt(0);
        const clone: Range = range.cloneRange();
        const fixedPosition: number = range.endOffset;
        let rect: DOMRect;
        if (fixedPosition >= (range.endContainer as Text).length || range.endContainer === this.element) {
            const dummy: Text = document.createTextNode('&#8203;');
            clone.insertNode(dummy);
            clone.selectNode(dummy);
            rect = clone.getBoundingClientRect();
            (dummy.parentNode as Node & ParentNode).removeChild(dummy);
        } else {
            clone.setStart(range.endContainer, fixedPosition);
            clone.setEnd(range.endContainer, fixedPosition + 1);
            rect = clone.getBoundingClientRect();
        }
        clone.detach();
        return rect;
    }

    private splitByCaret(): {front: string, behind: string} {
        const range: Range = (window.getSelection() as Selection).getRangeAt(0);
        let baseNode: Node = range.commonAncestorContainer;
        if (baseNode === this.element) {
            return {front: '', behind: ''};
        }
        while (baseNode.parentNode !== this.element) {
            while (baseNode.previousSibling) {
                baseNode = baseNode.previousSibling;
            }
            baseNode = baseNode.parentNode as Node & ParentNode;
        }
        // text in flont of the caret
        let frontNode: Node = baseNode;
        let front: string = (frontNode.textContent as string).substr(0, range.endOffset);
        while (frontNode.previousSibling) {
            frontNode = frontNode.previousSibling;
            front = frontNode.textContent + '\n' + front;
        }
        // text behind the caret
        let behindNode: Node = baseNode;
        let behind: string = (behindNode.textContent as string).substr(range.endOffset);
        while (behindNode.nextSibling) {
            behindNode = behindNode.nextSibling;
            behind = behind + '\n' + behindNode.textContent;
        }
        return {front, behind};
    }

    private setCaret(offset: number): void {
        function searchNode(node: Node): Node {
            if( node.childNodes.length ){
                var child = node.childNodes;
                var idx = 0;
                while(offset > child[idx].textContent!.length){
                    offset -= child[idx].textContent!.length;
                    idx++;
                }
                return searchNode(child[idx]);
            } else {
                return node;
            }
        }
        const node: Node = searchNode(this.element);
        const selection: Selection = window.getSelection() as Selection;
        selection.removeAllRanges();
        const range: Range = document.createRange();
        range.setStart(node, offset);
        range.collapse(true);
        selection.addRange(range);
    }

    private async updateStyle(): Promise<void> {
        if (this.behindColon !== '' && this.behindColon !== ':') {
            const emojis: Map<string, string> = await this.possibleEmojis(this.behindColon.substr(1));
            if (emojis.size > 0) {
                this.createEmojiList(emojis);
                const caretRect: DOMRect = this.getCaretPosition();
                const parentRect: DOMRect = this.element.parentElement!.getBoundingClientRect();
                this.emojiHelper.style.display = 'block';
                this.emojiHelper.style.top  = (caretRect.top - parentRect.top - this.emojiHelper.clientHeight) + 'px';
                this.emojiHelper.style.left = (caretRect.left - parentRect.left) + 'px';
                return;
            }
        }
        this.emojiHelper.style.display = 'none';
    }

    private deleteText(count: number): string {
        if (count === 0) {
            return '';
        }
        let deleted: string;
        if (count > 0) {
            const length: number = this.textareaSplit.front.length - count;
            deleted = this.textareaSplit.front.substr(length);
            this.textareaSplit.front = this.textareaSplit.front.substr(0, length);
        } else {
            const length: number = -count;
            deleted = this.textareaSplit.behind.substr(0, length);
            this.textareaSplit.behind = this.textareaSplit.behind.substr(length);
        }
        return deleted;
    }

    private insertText(text: string): void {
        this.textareaSplit.front = this.textareaSplit.front + text;
    }

    private updateInnerHTML(): void {
        const scroll: number = this.element.scrollTop;
        this.element.innerHTML = this.value().split('\n').reduce((acc, cur) => {
            if (cur === '') {
                cur = '<br>';
            }
            return acc + '<div>' + cur + '</div>';
        }, '');
        this.updateStyle();
        this.element.focus();
        this.setCaret(this.textareaSplit.front.replace(/\n/g, '').length);
        this.element.scrollTop = scroll;
    }

    private createEmojiList(emojis: Map<string, string>): void {
        const ul: HTMLUListElement = document.createElement('ul');
        ul.classList.add('list-group');
        this.emojiHelper.innerHTML = '';
        this.emojiHelper.appendChild(ul);
        for (const [name, html] of emojis) {
            const li: HTMLLIElement = this.createEmojiLi(name, html);
            ul.appendChild(li);
            li.addEventListener('click', event => {
                const selectedEmoji: string = li.dataset.emoji as string;
                const back: number = this.behindColon.length;
                this.behindColon = '';
                this.deleteText(back);
                this.insertText(selectedEmoji);
                this.updateInnerHTML();
            }, false);
        }
    }

    private createEmojiLi(fullName: string, previewHTML: string): HTMLLIElement {
        const name: string = this.behindColon.substr(1);
        const li: HTMLLIElement = document.createElement('li');
        li.classList.add('list-group-item', 'possible-emoji');
        li.dataset.emoji = fullName;
        li.innerHTML = previewHTML + ' ' + fullName.replace(name, `<span class="hightlight">${name}</span>`)
        return li;
    }
}

(() => {
    const mdTextArea: HTMLTextAreaElement = document.getElementById('markdown-edit-area') as HTMLTextAreaElement;
    const commentArea: HTMLInputElement = document.getElementById('comment-edit-area') as HTMLInputElement;
    const params: Params = new Params();
    let simpleMDE: SimpleMDE|null = null;
    let richMDE: RichMDE|null = null;

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
        if (simpleMDE !== null) {
            return simpleMDE.value();
        } else if (richMDE !== null) {
            return richMDE.value();
        }
        return mdTextArea.value;
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
        if (simpleMDE !== null) {
            target = simpleMDE.codemirror.display.wrapper;
        } else if (richMDE !== null) {
            target = richMDE.element;
        } else {
            target = mdTextArea;
        }
        const rect: DOMRect = target.getBoundingClientRect();
        scrollTo(0, rect.top);
    }, false);


    const mode: string = params.getValueOf('editor');
    switch (mode) {
        case 'simple':
            simpleMDE = new SimpleMDE({
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
            break;
        case 'textarea':
            break;
        default:
            richMDE = new RichMDE(mdTextArea);
    }
})();
