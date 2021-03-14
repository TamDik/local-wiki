import marked from 'marked';
import hljs from 'highlight.js';


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
    private readonly magicHandlers: IMagicHandler[] = [];
    public static readonly NEW_CLASS_NAME = 'new';

    public constructor(options: WikiMDOption) {
        this.value = '';
        this.toWikiURI = options.toWikiURI;
        this.isWikiLink = options.isWikiLink || (href => false);
    }

    public setValue(value: string): void {
        this.value = value;
    }

    public static expandMagics(html: string, handlers: IMagicHandler[], toWikiURI: ToWikiURI): string {
        const MAGIC_PATTERN: RegExp = /{{[^{}]+}}/g;
        const magicMatches: RegExpMatchArray|null = html.match(MAGIC_PATTERN);
        if (!magicMatches) {
            return html;
        }
        for (const magic of magicMatches) {
            const innerMagic: string = magic.replace(/(^{{|}}$)/g, '');
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
        if (infostring === 'math') {
            return ['<p><math>', code , '</math></p>'].join('');
        }
        const validLanguage = hljs.getLanguage(infostring) ? infostring : 'plaintext';
        return ['<pre><code>', hljs.highlight(validLanguage, code).value, '</code></pre>'].join('');
    }

    private link(href: string, title: string|null, text: string, isWikiLink: IsWikiLink): string {
        title = title === null ? '' : title;
        if (isWikiLink(href)) {
            href = this.toWikiURI(href);
        }
        return `<a href="${href}" title="${title}">${text}</a>`;
    }

    private image(href: string, title: string|null, text: string, isWikiLink: IsWikiLink): string {
        title = title === null ? '' : title;
        const alt: string = text;
        const isInternal: boolean = isWikiLink(href);
        const src: string = isInternal ? this.toWikiURI(href) : href;
        let img: string = `<img src="${src}" alt="${alt}" title="${title}" decoding="async" width="300">`;
        if (isInternal) {
            img = `<a href="${this.toWikiURI(href)}" class="image">${img}</a>`;
        }
        return img;
    }

    public addMagicHandler(magicHandler: IMagicHandler): void {
        this.magicHandlers.push(magicHandler);
    }
}


interface IMagicHandler {
    // 中身がこのハンドラーが対象とする物であるかを判定
    isTarget(content: string): boolean;

    // 中身を展開
    expand(content: string, toWikiURI: ToWikiURI): string;
}


export {WikiMD, IMagicHandler, ToWikiURI}
