import {WikiLink, WikiLocation} from './wikilink';
import {fileTypeOf} from './wikifile';
import {WikiMD} from './markdown';
import {Category} from './wikicategory';
import {FileHandler, NotFoundFileHandler, ImageFileHandler, PDFFileHandler, CategoryHandler, CategoryTreeHandler} from './markdown-magic-handler';


type ToFullPath = (wikiLink: WikiLink) => string|null;

interface HTMLOptions {
    baseNamespace?: string;  // 基準になる名前空間
    section?: number|null;   // htmlに変換する対象のsection
    edit?: boolean;          // 編集ボタンの表示非表示
    toc?: boolean;           // 目次の表示非表示
    toFullPath?: ToFullPath;
};


class HTMLOptionsComplementer implements HTMLOptions {
    private defaultValues: HTMLOptions = {
        baseNamespace: '',
        section: null,
        edit: false,
        toc: true,
        toFullPath: (wikiLink: WikiLink) => wikiLink.toPath(),
    }

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

    public get toFullPath(): ToFullPath {
        return this.complement<ToFullPath>('toFullPath');
    }
}


class MarkdownParser {
    private wikiMD: WikiMD;
    private categoryHandler: CategoryHandler;

    public constructor(private readonly opions: HTMLOptionsComplementer) {
        const baseNamespace: string = this.opions.baseNamespace;
        const toFullPath: ToFullPath = this.opions.toFullPath;

        this.wikiMD = new WikiMD({
            isWikiLink: WikiLink.isWikiLink,
            toWikiURI: (href: string) => {
                const wikiLink: WikiLink = new WikiLink(href, baseNamespace);
                const location: WikiLocation = new WikiLocation(wikiLink);
                return location.toURI();
            }
        });

        // file
        const fileHandler: FileHandler = new FileHandler((path: string) => new WikiLink(path, baseNamespace).type === 'File');
        this.wikiMD.addMagicHandler(fileHandler);

        // image
        fileHandler.addHandler(new ImageFileHandler(
            (path: string) => {
                const fullPath: string|null = toFullPath(new WikiLink(path, baseNamespace));
                return typeof(fullPath) === 'string' && fileTypeOf(fullPath) === 'image';
            }
        ));

        // pdf
        fileHandler.addHandler(new PDFFileHandler(
            (path: string) => {
                const fullPath: string|null = toFullPath(new WikiLink(path, baseNamespace));
                return typeof(fullPath) === 'string' && fileTypeOf(fullPath) === 'pdf';
            }
        ));

        // not found
        fileHandler.addHandler(new NotFoundFileHandler(
            (path: string) => {
                const fullPath: string|null = toFullPath(new WikiLink(path, baseNamespace));
                return fullPath === null;
            }
        ))

        // category
        this.categoryHandler = new CategoryHandler((path: string) => new WikiLink(path, baseNamespace).type === 'Category');
        this.wikiMD.addMagicHandler(this.categoryHandler);

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
        this.wikiMD.addMagicHandler(treeHandler);

    }

    public get baseNamespace(): string {
        return this.opions.baseNamespace;
    }

    private get toFullPath(): ToFullPath {
        return this.opions.toFullPath;
    }

    private expandWikiLink(html: string, baseNamespace: string): string {
        html = this.expandInternalFileLink(html, 'img', 'src', 'error', baseNamespace);
        html = this.expandInternalFileLink(html, 'object', 'data', 'error', baseNamespace);
        return html;
    }

    private expandInternalFileLink(html: string, tagName: string, prop: string, replace: string|null, baseNamespace: string): string {
        const PATTERN: RegExp = new RegExp(`(?<=<${tagName} [^>]*${prop}=")\\?path=[^"]+(?=")`, 'g');
        html = html.replace(PATTERN, s => {
            const wikiPath: string = s.slice(6);
            const wikiLink: WikiLink = new WikiLink(wikiPath, baseNamespace);
            if (wikiLink.type !== 'File') {
                return replace === null ? s : replace;
            }
            const fullPath: string|null = this.toFullPath(wikiLink);
            if (fullPath === null) {
                return replace === null ? s : replace;
            }
            return fullPath;
        });
        return html;
    }

    public execute(markdown: string): string {
        this.wikiMD.setValue(markdown);
        let html: string = this.wikiMD.toHTML();
        html = this.expandWikiLink(html, this.baseNamespace);
        return html;
    }

    public getCategories(): string[] {
        return this.categoryHandler.getCategories();
    }
}


class WikiMarkdown {
    public static readonly js: string[] = [
        './js/mathjax.js',
        './js/category-tree.js'
    ];
    private static readonly SECTION_PATTERN: RegExp = /^(?=(?: {1,3})?#{1,6}\s)/;
    private static readonly EDIT_CLASS: string = 'edit-section';
    private static readonly TOC_CLASS: string = 'toc-target';
    private sections: string[];

    public constructor(markdown: string, private wikiLink: WikiLink|null=null) {
        this.sections = this.splitWithSections(markdown);
    }

    private splitWithSections(markdown: string): string[] {
        return markdown.split(RegExp(WikiMarkdown.SECTION_PATTERN, 'm'));
    }

    private startWithHeading(text: string): boolean {
        return text.match(WikiMarkdown.SECTION_PATTERN) !== null;
    }

    private joinSections(sections: string[]): string {
        let joined: string = '';
        for (const section of sections) {
            if (joined !== '' && !joined.endsWith('\n')) {
                joined += '\n' + section;
            } else {
                joined += section;
            }
        }
        return joined;
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

    private checkEditAndWikiLink(edit: boolean): void {
        if (!edit) {
            return;
        }
        if (this.wikiLink === null) {
            throw new Error('need to set up wikiLink to add edit links.');
        }
    }

    public getMaxSection(): number {
        return this.sections.length - 1;
    }

    public parse(options: HTMLOptions={}): {html: string, categories: string[]} {
        const complementedOptions: HTMLOptionsComplementer = new HTMLOptionsComplementer(options);
        this.checkSectionNum(complementedOptions.section);
        this.checkEditAndWikiLink(complementedOptions.edit);

        const markdown: string = this.refineAndDecorateMarkdown(complementedOptions);
        const parser: MarkdownParser = new MarkdownParser(complementedOptions);
        return {html: parser.execute(markdown), categories: parser.getCategories()};
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
            sectionMarkdown[0] += this.tocMark(section);
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

    private tocMark(section: number): string {
        return `<span class="${WikiMarkdown.TOC_CLASS}" data-toc-section="${section}"></span>`;
    }
}


export {WikiMarkdown};
