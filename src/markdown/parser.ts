import * as fs from 'fs';
import marked from 'marked';
import {fileTypeOf} from '../wikifile';
import {WikiLink, WikiLocation} from '../wikilink';
import {Category} from '../wikicategory';
import {EmojiReplacer} from './emoji';
import {HTMLTagCreator, LinkTagCreator, ImageTagCreator, MathTagCreator, CodeTagCreator} from './tag-creator';
import {WikiLinkCollectable, WikiLinkFinder, ReferenceType} from './reference';
import {MagicHandler, FileHandler, NotFoundFileHandler, ImageFileHandler, PDFFileHandler, CategoryHandler, TemplateHandler, TemplateParameterHandler, NotFoundTemplateHandler, CategoryTreeHandler} from './magic-handler';


type ToFullPath = (wikiLink: WikiLink) => string|null;
type IsWikiLink = (href: string) => boolean;
type ToWikiURI = (href: string) => string;
type WikiMDOption = {toWikiURI: ToWikiURI, isWikiLink?: IsWikiLink};


interface HTMLOptions {
    baseNamespace?: string;  // 基準になる名前空間
    section?: number|null;   // htmlに変換する対象のsection
    edit?: boolean;          // 編集ボタンの表示非表示
    toc?: boolean;           // 目次の表示非表示
    template?: boolean;      // テンプレートの展開
    toFullPath?: ToFullPath; // WikiLinkからファイルパスへの展開
};


class HTMLOptionsComplementer implements HTMLOptions {
    private defaultValues: HTMLOptions = {
        baseNamespace: '',
        section: null,
        edit: false,
        toc: true,
        template: true,
        toFullPath: (wikiLink: WikiLink) => wikiLink.toPath(),
    };

    public constructor(private readonly options: HTMLOptions) {
    }

    private complement<T>(key: keyof HTMLOptions): T {
        if (this.options[key] === undefined) {
            if (this.defaultValues[key] === undefined) {
                throw new Error(`this.defaultValues[${key}] is not set`);
            }
            return this.defaultValues[key] as any;
        }
        return this.options[key] as any;
    }

    public get baseNamespace(): string {
        return this.complement<string>('baseNamespace');
    }

    public get section(): number|null {
        return this.complement<number|null>('section');
    }

    public get edit(): boolean {
        return this.complement<boolean>('edit');
    }

    public get toc(): boolean {
        return this.complement<boolean>('toc');
    }

    public get template(): boolean {
        return this.complement<boolean>('template');
    }

    public get toFullPath(): ToFullPath {
        return this.complement<ToFullPath>('toFullPath');
    }
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


class TemplateExpander {
    public constructor(private readonly options: HTMLOptionsComplementer, private readonly ignoringTemplates: WikiLink[]) {
    }

    public expand(text: string): string {
        const PARAM: string = 'data-parameter-([^=]*)="([^"]*)"';
        const PATTERN: RegExp = RegExp(`<div data-template-path="(?<path>[^"]*)"(?<parameters>(?: ${PARAM})*)>(?:.*)<\\/div>`, 'g');
        const PARAM_PATTERN: RegExp = RegExp(PARAM, 'g');
        for (const match1 of (text as any).matchAll(PATTERN)) {
            const wikiLink: WikiLink = new WikiLink(match1.groups.path, this.options.baseNamespace);
            const parameters: Map<string, string> = new Map();
            for (const match2 of match1.groups.parameters.matchAll(PARAM_PATTERN)) {
                parameters.set(match2[1], match2[2]);
            }
            text = text.replace(match1[0], this.expandTemplate(wikiLink, parameters));
        }
        return text;
    }

    private expandTemplate(wikiLink: WikiLink, parameters: Map<string, string>): string {
        if (this.isIgnoredTemplage(wikiLink)) {
            return this.templateLoop(wikiLink);
        }
        const filepath: string = this.options.toFullPath(wikiLink) as string;
        const markdown: string = this.expandParameters(fs.readFileSync(filepath, 'utf-8'), parameters);
        const ignoringTemplates = [...this.ignoringTemplates, wikiLink];
        const parser: MarkdownParser = new MarkdownParser(markdown, wikiLink, this.options, ignoringTemplates);
        return parser.parse();
    }

    private expandParameters(markdown: string, parameters: Map<string, string>): string {
        const handler: TemplateParameterHandler = new TemplateParameterHandler(parameters);
        const expander: MagicExpander = new MagicExpander((href: string) => {
            const wikiLink: WikiLink = new WikiLink(href, this.options.baseNamespace);
            const location: WikiLocation = new WikiLocation(wikiLink);
            return location.toURI();
        }, 3);
        expander.addHandler(handler);
        return expander.expand(markdown);
    }

    private isIgnoredTemplage(wikiLink: WikiLink): boolean {
        for (const ignore of this.ignoringTemplates) {
            if (wikiLink.equals(ignore)) {
                return true;
            }
        }
        return false;
    }

    private templateLoop(wikiLink: WikiLink): string {
        const text: string = wikiLink.toPath();
        return [
            '<div class="alert alert-danger">',
                `Template loop detected: <span class="font-weight-bold">${text}</span>`,
            '</div>'
        ].join('');
    }
}


class WikiMD extends WikiLinkFinder {
    private value: string;
    private isWikiLink: IsWikiLink;
    private toWikiURI: ToWikiURI;
    private readonly magicHandlers: MagicHandler[] = [];
    public readonly checkboxProgress: {total: number, checked: number};
    public static readonly NEW_CLASS_NAME = 'new';

    public constructor(options: WikiMDOption, markdown: string) {
        super();
        this.value = markdown;
        this.checkboxProgress  = {total: 0, checked: 0};
        this.toWikiURI = options.toWikiURI;
        this.isWikiLink = options.isWikiLink || (href => false);
    }

    public toHTML(): string {
        marked.setOptions({pedantic: false, gfm: true, silent: false});
        const renderer: marked.Renderer = new marked.Renderer();
        renderer.text = (text: string) => this.text(text, new EmojiReplacer('apple'));
        renderer.code = this.code;
        renderer.link = (href: string, title: string|null, text: string) => this.link(href, title, text, this.isWikiLink);
        renderer.image = (href: string, title: string|null, text: string) => this.image(href, title, text, this.isWikiLink);
        renderer.checkbox = (checked: boolean) => this.checked(checked);

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

    private checked(checked: boolean): string {
        this.checkboxProgress.total++;
        if (checked) {
            this.checkboxProgress.checked++;
            return '<input disabled="" type="checkbox" checked></input>';
        }
        return '<input disabled="" type="checkbox"></input>';
    }

    public addMagicHandler(magicHandler: MagicHandler): void {
        this.magicHandlers.push(magicHandler);
    }
}


class MarkdownParser {
    private wikiMD: WikiMD;
    private readonly options: HTMLOptionsComplementer;
    private readonly references: ReferenceCollector;

    public constructor(private readonly markdown: string, private readonly wikiLink: WikiLink, options: HTMLOptionsComplementer|HTMLOptions, private readonly ignoringTemplates: WikiLink[]=[]) {
        if (options instanceof HTMLOptionsComplementer) {
            this.options = options;
        } else {
            this.options = new HTMLOptionsComplementer(options);
        }
        if (this.ignoringTemplates.length === 0) {
            this.ignoringTemplates.push(this.wikiLink);
        }
        this.wikiMD = this.createWikiMD();

        // References
        this.references = new ReferenceCollector(this.options.baseNamespace);
        this.wikiMD.addCollector(this.references);
    }

    private createWikiMD(): WikiMD {
        const baseNamespace: string = this.options.baseNamespace;
        const toFullPath: ToFullPath = this.options.toFullPath;

        const wikiMD: WikiMD = new WikiMD({
            isWikiLink: WikiLink.isWikiLink,
            toWikiURI: (href: string) => {
                const wikiLink: WikiLink = new WikiLink(href, baseNamespace);
                const location: WikiLocation = new WikiLocation(wikiLink);
                return location.toURI();
            }
        }, this.markdown);

        // file
        const fileHandler: FileHandler = new FileHandler((path: string) => new WikiLink(path, baseNamespace).type === 'File');
        wikiMD.addMagicHandler(fileHandler);
        fileHandler.addHandler(new ImageFileHandler(
            (path: string) => {
                const fullPath: string|null = toFullPath(new WikiLink(path, baseNamespace));
                return typeof(fullPath) === 'string' && fileTypeOf(fullPath) === 'image';
            }
        ));
        fileHandler.addHandler(new PDFFileHandler(
            (path: string) => {
                const fullPath: string|null = toFullPath(new WikiLink(path, baseNamespace));
                return typeof(fullPath) === 'string' && fileTypeOf(fullPath) === 'pdf';
            }
        ));
        fileHandler.addHandler(new NotFoundFileHandler(
            (path: string) => {
                const fullPath: string|null = toFullPath(new WikiLink(path, baseNamespace));
                return fullPath === null;
            }
        ))

        // category
        const categoryHandler = new CategoryHandler((path: string) => new WikiLink(path, baseNamespace).type === 'Category');
        wikiMD.addMagicHandler(categoryHandler);

        // template
        const templateHandler: TemplateHandler = new TemplateHandler((path: string) => {
            const wikiLink: WikiLink = new WikiLink(path, this.options.baseNamespace);
            if (wikiLink.type !== 'Template') {
                return false;
            }
            return toFullPath(wikiLink) !== null;
        });
        wikiMD.addMagicHandler(templateHandler);

        const notFoundTemplateHandler: NotFoundTemplateHandler = new NotFoundTemplateHandler((path: string) => {
            const wikiLink: WikiLink = new WikiLink(path, baseNamespace);
            if (wikiLink.type !== 'Template') {
                return false;
            }
            return toFullPath(wikiLink) === null;
        });
        wikiMD.addMagicHandler(notFoundTemplateHandler);

        // Category tree
        const treeHandler: CategoryTreeHandler = new CategoryTreeHandler(
            (path: string) => new WikiLink(path, baseNamespace).type === 'Category',
            (parentPath: string|null) => {
                let categories: Category[];
                if (parentPath === null) {
                    categories = Category.allUnder(baseNamespace).filter(category => category.parents.length === 0);
                } else {
                    categories = new Category(new WikiLink(parentPath, baseNamespace)).children;
                }
                return categories.map(category => category.toWikiLink().toFullPath());
            },
        );
        wikiMD.addMagicHandler(treeHandler);
        return wikiMD;
    }

    private expandWikiLink(html: string, baseNamespace: string): string {
        html = this.expandInternalFileLink(html, 'img', 'src', 'error', baseNamespace);
        html = this.expandInternalFileLink(html, 'object', 'data', 'error', baseNamespace);
        return html;
    }

    private expandInternalFileLink(html: string, tagName: string, prop: string, replace: string|null, baseNamespace: string): string {
        const PATTERN: RegExp = new RegExp(`(?<=<${tagName} [^>]*${prop}=")\\?path=[^"]+(?=")`, 'g');
        html = html.replace(PATTERN, s => {
            const path: string = s.slice(6);
            const wikiLink: WikiLink = new WikiLink(path, baseNamespace);
            if (wikiLink.type !== 'File') {
                return replace === null ? s : replace;
            }
            const fullPath: string|null = this.options.toFullPath(wikiLink);
            if (fullPath === null) {
                return replace === null ? s : replace;
            }
            return fullPath;
        });
        return html;
    }

    public parse(): string {
        let html: string = this.wikiMD.toHTML();
        html = this.expandWikiLink(html, this.options.baseNamespace);
        if (this.options.template) {
            const expander: TemplateExpander = new TemplateExpander(this.options, this.ignoringTemplates);
            html = expander.expand(html);
        }
        const progressBar: string = this.progressBar();
        return progressBar + html;
    }

    private progressBar(): string {
        const total: number = this.wikiMD.checkboxProgress['total'];
        if (total === 0) {
            return '';
        }
        const checked: number = this.wikiMD.checkboxProgress['checked'];
        const width: number = Math.round(100 * checked / total);
        return `<div class="progress mb-2"><div class="progress-bar bg-info" style="width: ${width}%">${width}%</div></div>`;
    }

    public getLinks(): string[] {
        return this.references.getLinks();
    }

    public getMedias(): string[] {
        return this.references.getMedias();
    }

    public getTemplates(): string[] {
        return this.references.getTemplates();
    }

    public getCategories(): string[] {
        return this.references.getCategories();
    }
}


class ReferenceCollector implements WikiLinkCollectable {
    private readonly reference: {link: string[], media: string[], template: string[], category: string[]};

    public constructor(private readonly baseNamespace: string) {
        this.reference = {link: [], media: [], template: [], category: []};
    }

    public addWikiLink(href: string, type: ReferenceType): void {
        const wikiLink: WikiLink = new WikiLink(href, this.baseNamespace);
        if (type === 'template' && wikiLink.type !== 'Template') {
            return;
        }
        if (type === 'category' && wikiLink.type !== 'Category') {
            return;
        }
        for (const reference of this.reference[type]) {
            const wl: WikiLink = new WikiLink(reference, this.baseNamespace);
            if (wl.equals(wikiLink)) {
                return;
            }
        }
        this.reference[type].push(href);
    }

    public getLinks(): string[] {
        return this.reference.link;
    }

    public getMedias(): string[] {
        return this.reference.media;
    }

    public getTemplates(): string[] {
        return this.reference.template;
    }

    public getCategories(): string[] {
        return this.reference.category;
    }
}


export {WikiMD, MarkdownParser, HTMLOptions, HTMLOptionsComplementer};
