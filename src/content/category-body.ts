import * as fs from 'fs';
import {upperCaseFirst, compareLowerCase} from '../utils';
import {WikiLink, WikiLocation} from '../wikilink';
import {toFullPath} from '../wikihistory-builder';
import {MarkdownEditorBody, MarkdownHistoryBody} from './markdown-body';
import {ContentBodyDispatcher, ContentBody} from './content-body';
import {WithVersionBody, NotFoundVersionBody} from './version-body';
import {Category} from '../wikicategory';
import {CategoryTreeHandler} from '../markdown-magic-handler';
import * as markdown from './markdown';


class CategoryContentBodyDispatcher extends ContentBodyDispatcher {
    protected readContentBody(wikiLink: WikiLink): ContentBody {
        return new CategoryReadBody(wikiLink);
    }

    protected editContentBody(wikiLink: WikiLink): ContentBody {
        return new MarkdownEditorBody(wikiLink);
    }

    protected historyContentBody(wikiLink: WikiLink): ContentBody {
        return new MarkdownHistoryBody(wikiLink);
    }

    protected contentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody {
        return new CategoryWithVersionReadBody(wikiLink, version);
    }

    protected notFoundReadContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundCategoryReadBody(wikiLink);
    }

    protected notFoundEditContentBody(wikiLink: WikiLink): ContentBody {
        return this.editContentBody(wikiLink);
    }

    protected notFoundContentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody {
        return new NotFoundVersionBody(wikiLink, version);
    }
}


class CategoryReadBody extends ContentBody {
    public js: string[] = [
        ...markdown.js,
    ];
    public css: string[] = [
        ...markdown.css,
    ];

    public get html(): string {
        const lines: string[] = [
            this.pageHtml(),
            this.listHtml(),
        ];
        return lines.join('');
    }

    protected pageHtml(): string {
        const filepath: string = toFullPath(this.wikiLink) as string;
        const text: string = fs.readFileSync(filepath, 'utf-8');
        return markdown.parse(text, this.wikiLink);
    }

    private listHtml(): string {
        const category: Category = new Category(this.wikiLink);
        const referedLinks: WikiLink[] = category.refered;
        if (referedLinks.length === 0) {
            return 'This category currently contains no pages or media.';
        }

        const lines: string[] = [];

        const categories: WikiLink[] = referedLinks.filter(wikiLink => wikiLink.type === 'Category');
        if (categories.length !== 0) {
            lines.push(this.categoryList(categories));
        }

        const pages: WikiLink[] = referedLinks.filter(wikiLink => wikiLink.type === 'Page');
        if (pages.length !== 0) {
            lines.push(this.pageList(pages));
        }

        const files: WikiLink[] = referedLinks.filter(wikiLink => wikiLink.type === 'File');
        if (files.length !== 0) {
            lines.push(this.fileList(files));
        }
        return lines.join('');
    }

    private categoryList(wikiLinks: WikiLink[]): string {
        const lines: string[] = [];
        lines.push('<h2>Subcategories</h2>');
        const categoryWord: string = wikiLinks.length === 1 ? 'subcategory' : 'subcategories';
        lines.push(`This category has the following ${wikiLinks.length} ${categoryWord}.`);
        for (const wikiLink of wikiLinks) {
            const root: string = wikiLink.toFullPath();
            lines.push(this.categoryTree(wikiLink));
        }
        return lines.join('');
    }

    private categoryTree(wikiLink: WikiLink): string {
        const baseNamespace: string = this.wikiLink.namespace
        return CategoryTreeHandler.createHTML(
            (href: string) => {
                const wikiLink: WikiLink = new WikiLink(href, baseNamespace);
                const location: WikiLocation = new WikiLocation(wikiLink);
                return location.toURI();
            },
            (parentPath: string|null) => {
                let categories: Category[];
                if (parentPath === null) {
                    categories = Category.allUnder(baseNamespace).filter(category => category.parents.length === 0);
                } else {
                    categories = new Category(new WikiLink(parentPath, baseNamespace)).children;
                }
                return categories.map(category => category.toWikiLink().toFullPath());
            },
            {root: wikiLink.toFullPath(), depth: 0, border: false}
        );
    }

    private pageList(wikiLinks: WikiLink[]): string {
        return this.wikiLinkList(wikiLinks, 'page', 'pages');
    }

    private fileList(wikiLinks: WikiLink[]): string {
        return this.wikiLinkList(wikiLinks, 'file', 'files');
    }

    private wikiLinkList(wikiLinks: WikiLink[], singular: string, plural: string): string {
        const lines: string[] = [];
        lines.push(`<h2>${upperCaseFirst(plural)} in category "${this.wikiLink.name}"</h2>`);
        const typeAndBe: string = wikiLinks.length === 1 ? `${singular} is` : `${plural} are`;
        lines.push(`The following ${wikiLinks.length} ${typeAndBe} in this category.`);

        lines.push('<ul class="column-count-3">');
        for (const wikiLink of this.sortWikiLinksByNamespaceAndName(wikiLinks)) {
            const location: WikiLocation = new WikiLocation(wikiLink);
            let text: string = wikiLink.name;
            if (wikiLink.namespace !== this.wikiLink.namespace) {
                text += ` (${wikiLink.namespace})`;
            }
            lines.push(`<li><a href="${location.toURI()}">${text}</a></li>`);
        }
        lines.push('</ul>');
        return lines.join('');
    }

    private sortWikiLinksByNamespaceAndName(wikiLinks: WikiLink[]): WikiLink[] {
        const sortedByNamespace: Map<string, WikiLink[]> = new Map();
        const namespaces: string[] = [];
        for (const wikilink of wikiLinks) {
            const ns: string = wikilink.namespace;
            if (!sortedByNamespace.has(ns)) {
                sortedByNamespace.set(ns, []);
                namespaces.push(ns);
            }
            sortedByNamespace.get(ns)!.push(wikilink);
        }
        for (const wikiLinks of sortedByNamespace.values()) {
            wikiLinks.sort((w1, w2) => compareLowerCase(w1.name, w2.name));
        }

        const sorted: WikiLink[] = []
        if (sortedByNamespace.has(this.wikiLink.namespace)) {
            sorted.push(...sortedByNamespace.get(this.wikiLink.namespace)!);
        }
        for (const ns of namespaces.sort()) {
            if (ns === this.wikiLink.namespace) {
                continue;
            }
            sorted.push(...sortedByNamespace.get(ns)!);
        }
        return sorted;
    }
}


class CategoryWithVersionReadBody extends WithVersionBody {
    public js: string[] = [
        ...markdown.js,
    ];
    public css: string[] = [
        ...markdown.css,
    ];

    protected mainContent(version: number): string {
        const filepath: string = toFullPath(this.wikiLink, version) as string;
        const text: string = fs.readFileSync(filepath, 'utf-8');
        let html = markdown.parse(text, this.wikiLink);
        html += new class extends CategoryReadBody {
            protected pageHtml(): string {
                return '';
            }
        }(this.wikiLink).html;
        return html;
    }
}


class NotFoundCategoryReadBody extends CategoryReadBody {
    protected pageHtml(): string {
        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('mode', 'edit');
        return `<p>There is currently no text in this page. You can <a href="${location.toURI()}">create this page</a>.</p>`;
    }
}


export {CategoryContentBodyDispatcher};
