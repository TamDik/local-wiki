import * as fs from 'fs';
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
        const lines: string[] = [];
        lines.push(`<h2>Pages in category "${this.wikiLink.name}"</h2>`);
        const pageAndBe: string = wikiLinks.length === 1 ? 'page is' : 'pages are';
        lines.push(`The following ${wikiLinks.length} ${pageAndBe} in this category.`);

        lines.push('<ul class="column-count-3">');
        for (const wikiLink of wikiLinks) {
            const location: WikiLocation = new WikiLocation(wikiLink);
            lines.push(`<li><a href="${location.toURI()}">${wikiLink.toPath()}</a></li>`);
        }
        lines.push('</ul>');
        return lines.join('');
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
