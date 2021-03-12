import * as fs from 'fs';
import {WikiLink, WikiLocation} from '../wikilink';
import {toFullPath} from '../wikihistory-builder';
import {MarkdownEditorBody, MarkdownHistoryBody} from './markdown-body';
import {ContentBodyDispatcher, ContentBody} from './content-body';
import {WithVersionBody, NotFoundVersionBody} from './version-body';
import {Category} from '../wikicategory';
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
        const lines: string[] = [];
        const category: Category = new Category(this.wikiLink);
        const referedLinks: WikiLink[] = category.refered;
        if (referedLinks.length === 0) {
            lines.push('This category currently contains no pages or media.');
        } else {
            lines.push(`<h2 class="pt-3">Pages in category "${this.wikiLink.name}"</h2>`);
            lines.push(`The following ${referedLinks.length} pages are in this category.`);
            lines.push('<ul>');
            for (const refered of referedLinks) {
                const location: WikiLocation = new WikiLocation(refered);
                lines.push(`<li><a href="${location.toURI()}">${refered.toPath()}</a></li>`);
            }
            lines.push('</ul>');
        }
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
