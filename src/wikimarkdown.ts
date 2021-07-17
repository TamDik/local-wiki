import * as fs from 'fs';
import {WikiLink, WikiLocation} from './wikilink';
import {fileTypeOf} from './wikifile';
import {WikiMD, MagicHandler} from './markdown';
import {ReferenceCollector} from './reference-collector';
import {Category} from './wikicategory';
import {FileHandler, NotFoundFileHandler, ImageFileHandler, PDFFileHandler, CategoryHandler, TemplateHandler, TemplateParameterHandler, NotFoundTemplateHandler, CategoryTreeHandler} from './markdown-magic-handler';


type ToFullPath = (wikiLink: WikiLink) => string|null;

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


class TemplateExpander {
    private handler: TemplateHandler;

    public constructor(private readonly options: HTMLOptionsComplementer, private readonly loops: WikiLink[]) {
        this.handler = new TemplateHandler((path: string) => {
            const wikiLink: WikiLink = new WikiLink(path, this.baseNamespace);
            if (wikiLink.type !== 'Template') {
                return false;
            }
            const fullPath: string|null = this.toFullPath(new WikiLink(path, this.baseNamespace));
            return typeof(fullPath) === 'string';
        });
    }

    public execute(text: string): string {
        const PATTERN: RegExp = /<div data-template="([^"]*)"><\/div>/g;
        // NOTE: テンプレートを展開後にマークダウンの解析は行われるのでWikiLinkCollectableは不要
        const expanded: string = WikiMD.expandMagics(text, [this.handler], this.toWikiURI);
        return expanded.replace(PATTERN, s => {
            const templateId: string = s.slice(20, -8);
            return this.expandTemplate(templateId);
        });
    }

    private expandTemplate(templateId: string): string {
        const path: string = this.handler.getWikiPath(templateId);
        const wikiLink: WikiLink = new WikiLink(path, this.baseNamespace)
        if (this.isIgnoredTemplage(wikiLink)) {
            return this.templateLoop(wikiLink);
        }

        const filepath: string = this.toFullPath(wikiLink) as string;
        let markdown: string = fs.readFileSync(filepath, 'utf-8');
        markdown = this.expandParameters(templateId, markdown);
        const ignores: WikiLink[] = [...this.loops, wikiLink];
        const expander: TemplateExpander = new TemplateExpander(this.options, ignores);
        return expander.execute(markdown);
    }

    private expandParameters(templateId: string, text: string): string {
        const parameters: Map<string, string> = this.handler.getParameter(templateId);
        const handler: TemplateParameterHandler = new TemplateParameterHandler(parameters);
        return WikiMD.expandMagics(text, [handler], this.toWikiURI, [], 3);
    }

    private templateLoop(wikiLink: WikiLink): string {
        const text: string = wikiLink.toPath();
        return [
            '<div class="alert alert-danger">',
                `Template loop detected: <span class="font-weight-bold">${text}</span>`,
            '</div>'
        ].join('');
    }

    private isIgnoredTemplage(wikiLink: WikiLink): boolean {
        for (const ignore of this.loops) {
            if (wikiLink.equals(ignore)) {
                return true;
            }
        }
        return false;
    }

    private toWikiURI(href: string): string {
        const wikiLink: WikiLink = new WikiLink(href, this.baseNamespace);
        const location: WikiLocation = new WikiLocation(wikiLink);
        return location.toURI();
    }

    private get baseNamespace(): string {
        return this.options.baseNamespace;
    }

    private get toFullPath(): ToFullPath {
        return this.options.toFullPath;
    }
}

class MarkdownParser {
    private wikiMD: WikiMD;
    private readonly options: HTMLOptionsComplementer;
    private readonly references: ReferenceCollector;

    public constructor(private readonly markdown: string, private readonly wikiLink: WikiLink, options: HTMLOptionsComplementer|HTMLOptions) {
        if (options instanceof HTMLOptionsComplementer) {
            this.options = options;
        } else {
            this.options = new HTMLOptionsComplementer(options);
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
        });

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

    public execute(): string {
        let expanded: string;
        if (this.options.template) {
            const expander: TemplateExpander = new TemplateExpander(this.options, [this.wikiLink]);
            expanded = expander.execute(this.markdown);
        } else {
            expanded = this.markdown;
        }
        this.wikiMD.setValue(expanded);
        let html: string = this.wikiMD.toHTML();
        html = this.expandWikiLink(html, this.options.baseNamespace);
        return html;
    }

    public getCategories(): string[] {
        return this.references.getCategories();
    }
}


class WikiMarkdown {
    public static readonly js: string[] = [
        './js/renderer/markdown.js',
        // NOTE: オプション的な機能を分離しておく
        './js/renderer/mathjax.js',
        './js/renderer/category-tree.js'
    ];
    public static readonly css: string[] = [
        '../node_modules/highlight.js/styles/github-gist.css',
    ];
    private static readonly EDIT_CLASS: string = 'edit-section';
    private static readonly TOC_CLASS: string = 'toc-target';
    private sections: string[];

    public constructor(markdown: string, private wikiLink: WikiLink) {
        this.sections = this.splitWithSections(markdown);
    }

    public get baseNamespace(): string {
        return this.wikiLink.namespace;
    }

    private splitWithSections(markdown: string): string[] {
        if (markdown === '') {
            return [markdown];
        }

        const sections: string[] = [];
        let sectionLines: string[] = [];
        let codeFence: string = '';
        const OPENING_CODE_FENCE = /^((`|~){3,})(.*)/;
        for (const line of markdown.split('\n')) {
            const match: RegExpMatchArray | null = line.match(OPENING_CODE_FENCE);
            if (match) {
                const fence = match[1];
                if (codeFence === '') {
                    codeFence = fence;
                } else if (fence.startsWith(codeFence)) {
                    codeFence = '';
                }
            }

            if (codeFence === '' && sectionLines.length !== 0 && this.startWithHeading(line)) {
                sections.push(sectionLines.join('\n') + '\n');
                sectionLines = [];
            }
            sectionLines.push(line)
        }
        if (sectionLines.length !== 0) {
            sections.push(sectionLines.join('\n') + '\n');
        }
        return sections;
    }

    private startWithHeading(text: string): boolean {
        const SECTION_PATTERN: RegExp = /^(?=(?: {1,3})?#{1,6}\s)/;
        return text.match(SECTION_PATTERN) !== null;
    }

    private joinSections(sections: string[]): string {
        return sections.join('');
    }

    public setSection(section: number, text: string): void {
        this.checkSectionNum(section);
        const sections: string[] = [...this.sections];
        sections[section] = text;
        const markdown: string = this.joinSections(sections);
        this.sections = this.splitWithSections(markdown);
    }

    public getSection(section: number): string {
        this.checkSectionNum(section);
        return this.sections[section];
    }

    public getRawText(): string {
        return this.joinSections(this.sections)
    }

    private checkSectionNum(section: number|null): void {
        if (section === null) {
            return;
        }
        if (section < 0 || section > this.getMaxSection()) {
            throw new Error(`section must be in the range 0-${this.getMaxSection()} but ${section} is given`);
        }
    }

    public getMaxSection(): number {
        return this.sections.length - 1;
    }

    public parse(options: HTMLOptions={}): {html: string, categories: string[]} {
        options.baseNamespace = this.baseNamespace;
        const complementedOptions: HTMLOptionsComplementer = new HTMLOptionsComplementer(options);
        this.checkSectionNum(complementedOptions.section);

        const markdown: string = this.refineAndDecorateMarkdown(complementedOptions);
        const parser: MarkdownParser = new MarkdownParser(markdown, this.wikiLink, complementedOptions);
        return {html: parser.execute(), categories: parser.getCategories()};
    }

    private refineAndDecorateMarkdown(options: HTMLOptionsComplementer): string {
        let text: string = '';
        const section: number|null = options.section;
        for (let si: number = 0, len = this.sections.length; si < len; si++) {
            const sectionText: string = this.sections[si];
            if (section === null) {
                text += this.decorateSection(sectionText, si, options);
            }
            if (section === si) {
                text = this.decorateSection(sectionText, si, options);
                break;
            }
        }
        return text;
    }

    private decorateSection(text: string, section: number, options: HTMLOptionsComplementer): string {
        const [heading, ...lines]: string[] = text.split('\n');
        if (!this.startWithHeading(text)) {
            return text;
        }
        const sectionMarkdown: string[] = [heading];
        if (options.edit) {
            sectionMarkdown[0] += this.editButton(section);
        }
        if (options.toc) {
            sectionMarkdown[0] += this.tocMark();
        }
        sectionMarkdown.push(...lines);
        return sectionMarkdown.join('\n');
    }

    private editButton(section: number): string {
        const location: WikiLocation = new WikiLocation(this.wikiLink as WikiLink);
        location.addParam('mode', 'edit')
        location.addParam('section', String(section));
        return `<span class="${WikiMarkdown.EDIT_CLASS}"><a href="${location.toURI()}"></a></span>`;
    }

    private tocMark(): string {
        return `<span class="${WikiMarkdown.TOC_CLASS}"></span>`;
    }
}


export {MarkdownParser, WikiMarkdown};
