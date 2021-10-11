import {WikiLink, WikiLocation} from '../wikilink';
import {MarkdownParser, HTMLOptions, HTMLOptionsComplementer} from './parser';


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
                sections.push(sectionLines.join('\n'));
                sectionLines = [];
            }
            sectionLines.push(line)
        }
        if (sectionLines.length !== 0) {
            sections.push(sectionLines.join('\n'));
        }
        return sections;
    }

    private startWithHeading(text: string): boolean {
        const SECTION_PATTERN: RegExp = /^(?=(?: {1,3})?#{1,6}\s)/;
        return text.match(SECTION_PATTERN) !== null;
    }

    private joinSections(sections: string[]): string {
        return sections.join('\n');
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

    public parse(options: HTMLOptions={}): {html: string, links: string[], medias: string[], templates: string[], categories: string[]} {
        options.baseNamespace = this.baseNamespace;
        const complementedOptions: HTMLOptionsComplementer = new HTMLOptionsComplementer(options);
        this.checkSectionNum(complementedOptions.section);

        const markdown: string = this.refineAndDecorateMarkdown(complementedOptions);
        const parser: MarkdownParser = new MarkdownParser(markdown, this.wikiLink, complementedOptions);
        return {
            html: parser.parse(),
            links: parser.getLinks(),
            medias: parser.getMedias(),
            templates: parser.getTemplates(),
            categories: parser.getCategories(),
        };
    }

    private refineAndDecorateMarkdown(options: HTMLOptionsComplementer): string {
        const section: number|null = options.section;
        const lines: string[] = [];
        for (let si: number = 0, len = this.sections.length; si < len; si++) {
            const sectionText: string = this.sections[si];
            if (section === null) {
                lines.push(this.decorateSection(sectionText, si, options));
            }
            if (section === si) {
                lines.push(this.decorateSection(sectionText, si, options));
                break;
            }
        }
        return lines.join('\n');
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


export {WikiMarkdown};
