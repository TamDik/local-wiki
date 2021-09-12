import * as fs from 'fs';
import * as path from 'path';
import marked from 'marked';
import hljs from 'highlight.js';
import {APP_DIR} from './data-dir';

const DIST_IMAGE_DIR: string = path.join(APP_DIR, 'dist/images')
const DIST_JS_DIR: string = path.join(APP_DIR, 'dist/js')

type ReferenceType = 'link'|'media'|'template'|'category';

type ToWikiURI = (href: string) => string;

type IsWikiLink = (href: string) => boolean;

type WikiMDOption = {
    toWikiURI: ToWikiURI,
    isWikiLink?: IsWikiLink,
};


interface WikiLinkCollectable {
    addWikiLink(href: string, type: ReferenceType): void;
}


abstract class WikiLinkFinder {
    protected collectors: WikiLinkCollectable[] = [];
    public addCollector(collector: WikiLinkCollectable): void {
        this.collectors.push(collector);
    }

    public foundWikiLink(href: string, type: ReferenceType): void {
        for (const collector of this.collectors) {
            collector.addWikiLink(href, type);
        }
    }
}


class WikiMD extends WikiLinkFinder {
    private value: string;
    private isWikiLink: IsWikiLink;
    private toWikiURI: ToWikiURI;
    private readonly magicHandlers: MagicHandler[] = [];
    public static readonly NEW_CLASS_NAME = 'new';

    public constructor(options: WikiMDOption) {
        super();
        this.value = '';
        this.toWikiURI = options.toWikiURI;
        this.isWikiLink = options.isWikiLink || (href => false);
    }

    public setValue(value: string): void {
        this.value = value;
    }

    public toHTML(): string {
        marked.setOptions({pedantic: false, gfm: true, silent: false});
        const renderer: marked.Renderer = new marked.Renderer();
        renderer.text = (text: string) => this.text(text, new EmojiReplacer('apple'));
        renderer.code = this.code;
        renderer.link = (href: string, title: string|null, text: string) => this.link(href, title, text, this.isWikiLink);
        renderer.image = (href: string, title: string|null, text: string) => this.image(href, title, text, this.isWikiLink);
        const walkTokens = (token: any) => {
            if (token.type === 'heading') {
                if (token.depth === 1) {
                    token.depth = 2;
                }
            }
        };
        marked.use({renderer, walkTokens});
        return marked(this.value);
    }

    private text(text: string, emojiReplacer: EmojiReplacer): string {
        text = emojiReplacer.replace(text);

        const expander = new MagicExpander(this.toWikiURI);
        for (const collector of this.collectors) {
            expander.addCollector(collector);
        }
        for (const handler of this.magicHandlers) {
            expander.addHandler(handler);
        }
        return expander.expand(text);
    }

    private code(code: string, infostring: string): string {
        let handler: HTMLTagCreator;
        if (infostring === 'math') {
            handler = new MathTagCreator(code);
        } else {
            handler = new CodeTagCreator(code, infostring);
        }
        return handler.toHTML();
    }

    private link(href: string, title: string|null, text: string, isWikiLink: IsWikiLink): string {
        if (isWikiLink(href)) {
            this.foundWikiLink(href, 'link');
            href = this.toWikiURI(href);
        }
        const handler: LinkTagCreator = new LinkTagCreator(href, title, text);
        return handler.toHTML();
    }

    private image(href: string, title: string|null, alt: string, isWikiLink: IsWikiLink): string {
        let handler: ImageTagCreator;
        if (isWikiLink(href)) {
            this.foundWikiLink(href, 'media')
            handler = new ImageTagCreator(this.toWikiURI(href), alt, title, this.toWikiURI(href));
        } else {
            handler = new ImageTagCreator(href, alt, title);
        }
        return handler.toHTML();
    }

    public addMagicHandler(magicHandler: MagicHandler): void {
        this.magicHandlers.push(magicHandler);
    }
}


interface HTMLTagCreator {
    toHTML(): string;
}


class LinkTagCreator implements HTMLTagCreator {
    public constructor(private readonly href: string, private readonly title: string|null, private readonly text: string) {
    }

    public toHTML(): string {
        if (this.title === null) {
            return `<a href="${this.href}">${this.text}</a>`;
        }
        return `<a href="${this.href}" title="${this.title}">${this.text}</a>`;
    }
}


class ImageTagCreator implements HTMLTagCreator {
    private readonly params: {[key: string]: string|number|null};
    public constructor(src: string, readonly alt: string|null, readonly title: string|null, private readonly href?: string) {
        this.params = {src, alt, title, decoding: 'async', width: 300};
    }

    public toHTML(): string {
        const img: string = this.imgTag();
        if (!this.href) {
            return img;
        }
        return `<a href="${this.href}" class="image">${img}</a>`;
    }

    private imgTag(): string {
        let img: string = '<img';
        for (const key in this.params) {
            const value: string|number|null = this.params[key];
            if (value === null) {
                continue;
            }
            img += ` ${key}="${value}"`;
        }
        img += '>';
        return img;
    }
}


class MathTagCreator implements HTMLTagCreator {
    public constructor(private readonly code: string) {
    }

    public toHTML(): string {
        return `<p><math>${this.code}</math></p>`;
    }
}


class CodeTagCreator implements HTMLTagCreator {
    public constructor(private readonly code: string, private readonly infostring?: string) {
    }

    public toHTML(): string {
        let validLanguage: string;
        if (this.infostring) {
            validLanguage = hljs.getLanguage(this.infostring) ? this.infostring : 'plaintext';
        } else {
            validLanguage = 'plaintext';
        }
        const precode: string = '<pre><code>' + hljs.highlight(validLanguage, this.code).value + '</code></pre>';
        const copyButton: string = '<div class="copy-button">Copy</div>';
        return '<div class="code-wrapper">' + precode + copyButton + '</div>';
    }
}


abstract class MagicHandler extends WikiLinkFinder {
    // 中身がこのハンドラーが対象とする物であるかを判定
    abstract isTarget(content: string): boolean;

    // 中身を展開
    abstract expand(content: string, toWikiURI: ToWikiURI): string;
}


class MagicExpander extends WikiLinkFinder implements WikiLinkCollectable {
    private readonly handlers: MagicHandler[] = [];

    public constructor(private readonly toWikiURI: ToWikiURI, private readonly brackets: number=2) {
        super();
    }

    public addWikiLink(href: string, type: ReferenceType): void {
        this.foundWikiLink(href, type);
    }

    public addHandler(handler: MagicHandler): void {
        handler.addCollector(this);
        this.handlers.push(handler);
    }

    public static magics(text: string, brackets: number): {raw: string, text: string}[] {
        const PATTERN: RegExp = new RegExp(
            '(?<!{)' + '{'.repeat(brackets) + '[^{}]+' + '}'.repeat(brackets) + '(?!})', 'g');
        const matchs: RegExpMatchArray|null = text.match(PATTERN);
        if (!matchs) {
            return [];
        }
        const magics: {raw: string, text: string}[] = [];
        for (const raw of matchs) {
            const text: string = raw.slice(brackets, -brackets);
            magics.push({raw, text});
        }
        return magics;
    }

    public expand(html: string): string {
        for (const {raw, text} of MagicExpander.magics(html, this.brackets)) {
            for (const handler of this.handlers) {
                if (!handler.isTarget(text)) {
                    continue;
                }
                html = html.replace(raw, handler.expand(text, this.toWikiURI));
            }
        }
        return html;
    }
}


type EmojiSet = 'apple' | 'facebook' | 'google' | 'twitter';

type Emoji = {
    name: string,
    unified: string,
    sheet_x: number,
    sheet_y: number,
    short_name: string,
    short_names: string[],
    category: string,
    subcategory: string,
    sort_order: number
};

class EmojiReplacer {
    private readonly PATTERN: RegExp = /:[^:\s]+:/g
    private readonly emojiData: Emoji[];

    public constructor(private emojiSet: EmojiSet) {
        const jsonPath: string = path.join(DIST_JS_DIR, 'emoji.json');
        this.emojiData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }

    public replace(text: string): string {
        const matches: RegExpMatchArray|null = text.match(this.PATTERN);
        if (!matches) {
            return text;
        }
        for (const match of matches) {
            const content: string = match.slice(1, -1);
            const emoji: Emoji|null = this.searchEmoji(content);
            if (emoji === null) {
                continue;
            }
            text = text.replace(match, this.emojiImg(emoji));
        }
        return text;
    }

    private searchEmoji(content: string): Emoji|null {
        const SPACE_PATTERN: RegExp = /[-\s]/g;
        const unified: string = content.replace(SPACE_PATTERN, '_');
        for (const emoji of this.emojiData) {
            for (const short_name of emoji.short_names) {
                if (short_name.replace(SPACE_PATTERN, '_') === unified) {
                    return emoji;
                }
            }
        }
        return null;
    }

    private emojiImg(emoji: Emoji): string {
        const alt: string = emoji.name;
        const em: number = 1.2;
        const url: string = path.join(DIST_IMAGE_DIR, `emoji/sheet_${this.emojiSet}_64.png`);
        let style: string = 'display: inline-block;'
        style += `width: ${em}em; height: ${em}em;`
        style += `background-image: url(${url});`
        style += `background-size: ${em * 60}em;`
        style += `background-position: -${emoji.sheet_x * em}em -${emoji.sheet_y * em}em;`;
        return `<span style="${style}"></span>`
    }
}

export {WikiMD, WikiLinkCollectable, ReferenceType, MagicExpander, MagicHandler, ToWikiURI};
