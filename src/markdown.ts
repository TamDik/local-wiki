import marked from 'marked';
import hljs from 'highlight.js';
import * as utils from './utils';

type ReferenceType = 'link'|'media'|'template'|'category';

type ToWikiURI = (href: string) => string;

type IsWikiLink = (href: string) => boolean;

type WikiMDOption = {
    toWikiURI: ToWikiURI,
    isWikiLink?: IsWikiLink,
};


class WikiMD {
    private value: string;
    private isWikiLink: IsWikiLink;
    private toWikiURI: ToWikiURI;
    private readonly magicHandlers: MagicHandler[] = [];
    public static readonly NEW_CLASS_NAME = 'new';

    public constructor(options: WikiMDOption) {
        this.value = '';
        this.toWikiURI = options.toWikiURI;
        this.isWikiLink = options.isWikiLink || (href => false);
    }

    public setValue(value: string): void {
        this.value = value;
    }

    public static expandMagics(html: string, handlers: MagicHandler[], toWikiURI: ToWikiURI, brackets: number=2): string {
        const MAGIC_PATTERN: RegExp = new RegExp('{'.repeat(brackets) + '[^{}]+' + '}'.repeat(brackets), 'g');
        const magicMatches: RegExpMatchArray|null = html.match(MAGIC_PATTERN);
        if (!magicMatches) {
            return html;
        }
        for (const magic of magicMatches) {
            const innerMagic: string = magic.slice(brackets, -brackets);
            for (const handler of handlers) {
                if (!handler.isTarget(innerMagic)) {
                    continue;
                }
                html = html.replace(magic, handler.expand(innerMagic, toWikiURI));
            }
        }
        return html;
    }

    public toHTML(): string {
        marked.setOptions({pedantic: false, gfm: true, silent: false});
        const renderer: marked.Renderer = new marked.Renderer();
        renderer.code = this.code;
        renderer.link = (href: string, title: string|null, text: string) => this.link(href, title, text, this.isWikiLink);
        renderer.image = (href: string, title: string|null, text: string) => this.image(href, title, text, this.isWikiLink);
        marked.use({renderer});
        let html: string = marked(this.value);
        return WikiMD.expandMagics(html, this.magicHandlers, this.toWikiURI);
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
        magicHandler.setWikiMD(this);
        this.magicHandlers.push(magicHandler);
    }

    // NOTE: 参照関係を管理する場合にオーバーライドする．
    //       MagicHandlerの参照関係も管理するため，アクス修飾子はprotectedではなくpublic．
    public foundWikiLink(href: string, type: ReferenceType): void {
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
        return '<pre><code>' + hljs.highlight(validLanguage, this.code).value + '</code></pre>';
    }
}


interface IMagicHandler {
    // 中身がこのハンドラーが対象とする物であるかを判定
    isTarget(content: string): boolean;

    // 中身を展開
    expand(content: string, toWikiURI: ToWikiURI): string;
}


abstract class MagicHandler implements IMagicHandler {
    private wmd: WikiMD|null = null;

    public setWikiMD(wmd: WikiMD): void {
        this.wmd = wmd;
    }

    protected foundWikiLink(href: string, type: ReferenceType): void {
        if (this.wmd instanceof WikiMD) {
            this.wmd.foundWikiLink(href, type);
        }
    }

    abstract isTarget(content: string): boolean;

    abstract expand(content: string, toWikiURI: ToWikiURI): string;
}


export {WikiMD, ReferenceType, MagicHandler, ToWikiURI};
