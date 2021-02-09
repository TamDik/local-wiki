type keyevent = 'keyup' | 'keydown' // | 'keypress'

function keyPressAction($object: JQuery, keyCode: number, func: (e: any) => void,
                        {shift=false, ctrl=false}: {shift?: boolean, ctrl?: boolean}, keyevent: keyevent='keyup'): void {
    $object.on(keyevent, event => {
        console.log('event.which: ' + event.which);
        if ((shift && !event.shiftKey) || (!shift && event.shiftKey)) {
            return;
        }
        if ((ctrl && !event.ctrlKey) || (!ctrl && event.ctrlKey)) {
            return;
        }

        if (event.which === keyCode) {
            func(event);
            return false;
        }
    });
}

function deleteKeyAction($object: JQuery, func: (event: any) => void, keyevent: keyevent='keyup'): void {
    keyPressAction($object, 8, func, {}, keyevent);
}

function enterKeyAction($object: JQuery, func: (event: any) => void, keyevent: keyevent='keyup'): void {
    keyPressAction($object, 13, func, {}, keyevent);
}

function shiftEnterKeyAction($object: JQuery, func: (event: any) => void, keyevent: keyevent='keyup'): void {
    keyPressAction($object, 13, func, {shift: true}, keyevent);
}

function escKeyAction($object: JQuery, func: (event: any) => void, keyevent: keyevent='keyup'): void {
    keyPressAction($object, 27, func, {}, keyevent);
}

function ctrlCKeyAction($object: JQuery, func: (event: any) => void, keyevent: keyevent='keyup'): void {
    keyPressAction($object, 67, func, {ctrl: true}, keyevent);
}

function toHtml(text: string): JQuery {
    const $html = $('<span class="text">');
    let $c = $html;
    if (text.charAt(0) === '#') {
        const $h1 = $('<h1>');
        $h1.appendTo($c);
        $c = $h1;
        text = text.substring(1);
    }
    $c.text(text);

    return $html;
}


class Article {
    static readonly CLASS_NANE = 'article';
    private lines: Line[] = [];
    private $article: JQuery = $('<div>').addClass(Article.CLASS_NANE);

    constructor(text?: string) {
        if (text === undefined) {
            this.lines = [];
            return;
        }

        text.split('\n').forEach(line => {
            this.lines.push(new Line(this, line));
        });

        for (const line of this.lines) {
            this.$article.append(line.getObject());
        }
    }

    public toHtml(): void {
        for (const line of this.lines) {
            line.toHtmlMode();
        }
    }

    public getObject(): JQuery {
        return this.$article;
    }

    public addLine(text: string, prevLine: Line | null=null): Line {
        const targetLine: Line = new Line(this, text);

        // 先頭
        if (prevLine === null) {
            this.lines.unshift(targetLine);
            this.$article.prepend(targetLine.getObject());
            return targetLine;
        }

        // 先頭以外
        const lines: Line[] = [...this.lines];
        this.lines = [];
        for (const line of lines) {
            this.lines.push(line);
            if (line === prevLine) {
                this.lines.push(targetLine);
                targetLine.getObject().insertAfter(line.getObject());
            }
        }
        return targetLine;
    }

    public removeLine(targetLine: Line): void {
        this.lines = this.lines.filter(line => line != targetLine);
        targetLine.getObject().remove();
    }

    public getPrevLine(line: Line): Line | null {
        const i: number = this.lines.indexOf(line);
        if (i === -1) {
            return null;
        }
        if (i === 0) {
            return null;
        }
        return this.lines[i - 1];
    }

    public getNextLine(line: Line): Line | null {
        const i: number = this.lines.indexOf(line);
        if (i === -1) {
            return null;
        }
        if (i === this.lines.length - 1) {
            return null;
        }
        return this.lines[i + 1];
    }
}


enum LineMode {
    HTML,
    EDIT,
}


class Line {
    static readonly CLASS_NANE = 'article-line';
    private $line: JQuery;
    private mode: LineMode = LineMode.HTML;

    constructor(private article: Article, private rawText: string) {
        this.$line = $('<div>').addClass(Line.CLASS_NANE).append(toHtml(this.rawText));

        this.$line.on('click', event => {
            if (this.mode === LineMode.HTML) {
                this.article.toHtml();
                this.toEditMode();
            }
        });
    }

    public toHtmlMode(): void {
        if (this.mode === LineMode.HTML) {
            return;
        }
        this.rawText = <string>this.$line.find('input').val();
        this.mode = LineMode.HTML;
        this.$line.empty();
        this.$line.append(toHtml(this.rawText));
    }

    public toEditMode(): void {
        if (this.mode === LineMode.EDIT) {
            return;
        }
        const $input: JQuery = $('<input>').val(this.rawText);
        this.mode = LineMode.EDIT;
        this.$line.empty();
        this.$line.append($input);

        $input.focus()

        ctrlCKeyAction($input, () => {
            this.toHtmlMode();
        });

        enterKeyAction($input, () => {
            this.toHtmlMode();
            this.article.addLine('', this).toEditMode();
        });

        deleteKeyAction($input, event => {
            const prevLine: Line | null = this.article.getPrevLine(this);
            if (prevLine === null) {
                return;
            }

            const startIndex: number = $(event.target).get(0).selectionStart;
            if (startIndex !== 0) {
                return;
            }

            // 位置が一番後ろになってしまう
            const text: string = prevLine.getRawText() + $input.val();
            const newLine: Line = this.article.addLine(text, this.article.getPrevLine(prevLine));
            this.article.removeLine(prevLine);
            this.article.removeLine(this);
            newLine.toEditMode();

        }, 'keydown');
    }

    public getObject(): JQuery {
        return this.$line;
    }

    public getRawText(): string {
        return this.rawText;
    }
}



jQuery(() => {
    const text: string = '# aaa\nbbb\nccc';
    const article = new Article(text);
    $('.container').append(article.getObject());
});
