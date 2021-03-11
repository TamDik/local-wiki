import * as fs from 'fs';
import {WikiLink, WikiLocation} from '../wikilink';
import {toFullPath} from '../wikihistory-builder';
import {ContentBody, ContentBodyDispatcher} from './content-body';
import {MarkdownEditorBody, MarkdownHistoryBody} from './markdown-body';
import {NotFoundVersionBody, WithVersionBody} from './version-body';
import {CategoriesBody} from './special-body';
import * as markdown from './markdown';


class PageContentBodyDispatcher extends ContentBodyDispatcher {
    protected readContentBody(wikiLink: WikiLink): ContentBody {
        return new PageReadBody(wikiLink);
    }

    protected editContentBody(wikiLink: WikiLink): ContentBody {
        return new MarkdownEditorBody(wikiLink);
    }

    protected historyContentBody(wikiLink: WikiLink): ContentBody {
        return new MarkdownHistoryBody(wikiLink);
    }

    protected contentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody {
        return new PageWithVersionReadBody(wikiLink, version);
    }

    protected notFoundReadContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundPageBody(wikiLink);
    }

    protected notFoundEditContentBody(wikiLink: WikiLink): ContentBody {
        return this.editContentBody(wikiLink);
    }

    protected notFoundHistoryContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundPageBody(wikiLink);
    }

    protected notFoundContentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody {
        return new NotFoundVersionBody(wikiLink, version);
    }
}


class NotFoundPageBody extends ContentBody {
    public get html(): string {
        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('mode', 'edit');
        return `<p>There is currently no text in this page. You can <a href="${location.toURI()}">create this page</a>.</p>`;
    }
}


class PageReadBody extends ContentBody {
    public css: string[] = [
        '../node_modules/highlight.js/styles/github-gist.css',
    ];

    public js: string[] = [
        ...markdown.js
    ];

    public get html(): string {
        const filepath: string = toFullPath(this.wikiLink) as string;
        const text: string = fs.readFileSync(filepath, 'utf-8');
        const categoriesWikiLink: WikiLink = new WikiLink({namespace: this.wikiLink.namespace, type: 'Special', 'name': CategoriesBody.wikiName});
        const categoriesLocation: WikiLocation = new WikiLocation(categoriesWikiLink);
        return markdown.parse(text, this.wikiLink)
    }
}


class PageWithVersionReadBody extends WithVersionBody {
    protected mainContent(version: number): string {
        const filepath: string = toFullPath(this.wikiLink, version) as string;
        const text: string = fs.readFileSync(filepath, 'utf-8');
        return markdown.parse(text, this.wikiLink);
    }
}


export {PageContentBodyDispatcher};
