import * as fs from 'fs';
import * as path from 'path';
import {WikiConfig} from './wikiconfig';
import {WikiHistoryFactory, BufferPathGeneratorFactory} from './wikihistory-factory';
import {WikiHistory} from './wikihistory';
import {WikiLink} from './wikilink';
import {WikiMD} from './markdown';


class ContentGenerator {
    public static createTitle(mode: PageMode, wikiLink: WikiLink): string {
        const normalizedPath: string = wikiLink.toPath();
        switch (mode) {
            case 'read':
                return normalizedPath;
            case 'edit':
                return `editing ${normalizedPath}`
            case 'history':
                return `Revision history of "${normalizedPath}"`;
        }
    }

    public static createBody(mode: PageMode, wikiLink: WikiLink): string {
        const contentBody: ContentBody = ContentGenerator.dispatchContentBody(mode, wikiLink);
        return contentBody.html;
    }

    private static dispatchContentBody(mode: PageMode, wikiLink: WikiLink): ContentBody {
        let dispatcher: ContentBodyDispatcher;
        const config: WikiConfig = new WikiConfig();

        // 名前空間なし
        if (!config.hasNameSpace(wikiLink.namespace)) {
            return new NotFoundNameSpaceBody(wikiLink);
        }

        // typeごと
        switch (wikiLink.type) {
            case 'Page':
                dispatcher = ContentGenerator.createPageDispatcher(wikiLink);
                break;
            case 'File':
                dispatcher = ContentGenerator.createFileDispatcher(wikiLink);
                break;
        }
        return dispatcher.execute(mode);
    }

    private static createPageDispatcher(wikiLink: WikiLink): ContentBodyDispatcher {
        const history: WikiHistory = WikiHistoryFactory.create(wikiLink.namespace, wikiLink.type);
        if (history.hasName(wikiLink.name)) {
            return new PageContentBodyDispatcher(wikiLink);
        } else {
            return new NotFoundPageContentBodyDispatcher(wikiLink);
        }
    }

    private static createFileDispatcher(wikiLink: WikiLink): ContentBodyDispatcher {
        const history: WikiHistory = WikiHistoryFactory.create(wikiLink.namespace, wikiLink.type);
        if (history.hasName(wikiLink.name)) {
            return new FileContentBodyDispatcher(wikiLink);
        } else {
            return new NotFoundFileContentBodyDispatcher(wikiLink);
        }
    }
}


// -----------------------------------------------------------------------------
// ContentBodyDispatcher
// -----------------------------------------------------------------------------
abstract class ContentBodyDispatcher {
    public constructor(private readonly wikiLink: WikiLink) {
    }

    public execute(mode: PageMode): ContentBody {
        switch (mode) {
            case 'read':
                return this.createReadContentBody(this.wikiLink);
            case 'edit':
                return this.createEditContentBody(this.wikiLink);
            case 'history':
                return this.createHistoryContentBody(this.wikiLink);
        }
    }
    protected createReadContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundBody(wikiLink);
    }
    protected createEditContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundBody(wikiLink);
    }
    protected createHistoryContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundBody(wikiLink);
    }
}


class PageContentBodyDispatcher extends ContentBodyDispatcher {
    protected createReadContentBody(wikiLink: WikiLink): ContentBody {
        return new PageReadBody(wikiLink);
    }

    protected createEditContentBody(wikiLink: WikiLink): ContentBody {
        return new PageEditBody(wikiLink);
    }
}


class NotFoundPageContentBodyDispatcher extends ContentBodyDispatcher {
    protected createReadContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundPageBody(wikiLink);
    }
    protected createEditContentBody(wikiLink: WikiLink): ContentBody {
        return new PageEditBody(wikiLink);
    }
    protected createHistoryContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundPageBody(wikiLink);
    }
}


class FileContentBodyDispatcher extends ContentBodyDispatcher {
}


class NotFoundFileContentBodyDispatcher extends ContentBodyDispatcher {
}

// -----------------------------------------------------------------------------
// ContentBody
// -----------------------------------------------------------------------------
abstract class ContentBody {
    public abstract html: string;

    public constructor(protected readonly wikiLink: WikiLink) {
    }
}

class NotFoundBody extends ContentBody {
    public get html(): string {
        const lines: string[] = [
            '<div class="alert alert-danger" role="alert">',
              'The Page you are looking for doesn\'t exist or an other error occurred.<br>',
              'Choose a new direction, or Go to <a href="?path=Main">Main page.</a>',
            '</div>',
        ]
        return lines.join('');
    }
}

class NotFoundNameSpaceBody extends ContentBody {
    public get html(): string {
        const lines: string[] = [
            '<div class="alert alert-warning" role="alert">',
              'The namespace you are looking for doesn\'t exist or an other error occurred.<br>',
              'Choose a new direction, or Go to <a href="?path=Main">Main page.</a>',
            '</div>',
        ]
        return lines.join('');
    }
}

class NotFoundPageBody extends ContentBody {
    public get html(): string {
        const path: string = this.wikiLink.toPath();
        return `<p>There is currently no text in this page. You can <a class="internal" href="?path=${path}&mode=edit">create this page</a>.</p>`;
    }
}

class PageEditBody extends ContentBody {
    public get html(): string {
        const lines: string[] = [
            '<div class="row">',
              '<div class="col-12">',
                '<div class="alert alert-warning d-none" role="alert">',
                  '<strong>Remember that this is only a preview.</strong>',
                  'Your changes have not yet been saved! <a href="#markdown-edit-form"> → Go to editing area</a>',
                '</div>',
                '<div class="row">',
                  '<div id="preview-wrapper" class="col-12"></div>',
                '</div>',
                '<div class="row mb-2">',
                  '<div class="col-12">',
                    '<textarea id="markdown-edit-area" class="form-control"></textarea>',
                  '</div>',
                '</div>',
                '<div class="row mb-2">',
                  '<div class="col-12">',
                    '<input type="text" id="comment-edit-area" class="form-control" placeholder="Comment">',
                  '</div>',
                '</div>',
                '<div class="row">',
                  '<div class="col-2 offset-3">',
                    '<button type="button" id="page-edit-save-button" class="btn btn-primary btn-block">Save</button>',
                  '</div>',
                  '<div class="col-2">',
                    '<button type="button" id="page-edit-preview-button" class="btn btn-outline-secondary btn-block">Preview</button>',
                  '</div>',
                  '<div class="col-2">',
                    '<button type="button" id="page-edit-reset-button" class="btn btn-outline-danger btn-block">Reset</button>',
                  '</div>',
                '</div>',
              '</div>',
            '</div>',
        ];
        return lines.join('');
    }
}


class PageReadBody extends ContentBody {
    private toFullPath(path: string): string|null {
        const wl: WikiLink = new WikiLink(path)
        const namespace: string = wl.namespace;
        const wikiType: WikiType = wl.type;
        const name: string = wl.name;
        const history: WikiHistory = WikiHistoryFactory.create(namespace, wikiType);
        if (history.hasName(name)) {
            const {filename} = history.getByName(name);
            return BufferPathGeneratorFactory.create(namespace, wikiType).execute(filename);
        }
        return null;
    };

    public get html(): string {
        // TODO: リンクの展開
        const filepath: string = this.toFullPath(this.wikiLink.toPath()) as string;
        const text: string = fs.readFileSync(filepath, 'utf-8');
        const wmd: WikiMD = new WikiMD({isWikiLink: WikiLink.isWikiLink});
        wmd.setValue(text);
        return wmd.toHTML();
    }
}


export {ContentGenerator}
