import * as fs from 'fs';
import {toFullPath} from '../wikihistory-builder';
import {ContentBody, ContentBodyDispatcher} from './content-body';
import {NotFoundVersionBody, WithVersionBody} from './version-body';
import {MarkdownEditorBody, MarkdownHistoryBody} from './markdown-body';
import {WikiLink, WikiLocation} from '../wikilink';
import * as markdown from './markdown';


class TemplateContentBodyDispatcher extends ContentBodyDispatcher {
    protected readContentBody(wikiLink: WikiLink): ContentBody {
        return new TemplateReadBody(wikiLink);
    }

    protected editContentBody(wikiLink: WikiLink): ContentBody {
        return new MarkdownEditorBody(wikiLink);
    }

    protected historyContentBody(wikiLink: WikiLink): ContentBody {
        return new MarkdownHistoryBody(wikiLink);
    }

    protected contentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody {
        return new TemplateWithVersionReadBody(wikiLink, version);
    }

    protected notFoundReadContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundTemplateBody(wikiLink);
    }

    protected notFoundEditContentBody(wikiLink: WikiLink): ContentBody {
        return this.editContentBody(wikiLink);
    }

    protected notFoundContentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody {
        return new NotFoundVersionBody(wikiLink, version);
    }
}


class NotFoundTemplateBody extends ContentBody {
    public get html(): string {
        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('mode', 'edit');
        return `<p>There is currently no text in this page. You can <a href="${location.toURI()}">create this template</a>.</p>`;
    }
}


class TemplateReadBody extends ContentBody {
    public js: string[] = [
        ...markdown.js
    ];
    public css: string[] = [
        ...markdown.css,
    ];

    public get html(): string {
        const filepath: string = toFullPath(this.wikiLink) as string;
        const text: string = fs.readFileSync(filepath, 'utf-8');
        return markdown.parse(text, this.wikiLink)
    }
}


class TemplateWithVersionReadBody extends WithVersionBody {
    protected mainContent(version: number): string {
        const filepath: string = toFullPath(this.wikiLink, version) as string;
        const text: string = fs.readFileSync(filepath, 'utf-8');
        return markdown.parse(text, this.wikiLink);
    }
}

export {TemplateContentBodyDispatcher};
