import * as fs from 'fs';
import * as path from 'path';
import {date2str, bytes2str, zeroPadding} from './util';
import {WikiConfig} from './wikiconfig';
import {WikiHistoryFactory, BufferPathGeneratorFactory} from './wikihistory-factory';
import {BufferPathGenerator, WikiHistory, VersionData} from './wikihistory';
import {WikiLink} from './wikilink';
import {WikiMD, ImageFileHandler, PDFFileHandler} from './markdown';


function toFullPath(path: string): string|null {
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
            case 'Special':
                dispatcher = ContentGenerator.createSpecialDispacher(wikiLink);
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

    private static createSpecialDispacher(wikiLink: WikiLink): ContentBodyDispatcher {
        return new SpecialContentBodyDispatcher(wikiLink);
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

    protected createHistoryContentBody(wikiLink: WikiLink): ContentBody {
        return new PageHistoryBody(wikiLink);
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
    protected createReadContentBody(wikiLink: WikiLink): ContentBody {
        return new FileReadBody(wikiLink);
    }
}


class NotFoundFileContentBodyDispatcher extends ContentBodyDispatcher {
}


class SpecialContentBodyDispatcher extends ContentBodyDispatcher {
    protected createReadContentBody(wikiLink: WikiLink): ContentBody {
        const specials: SpecialContentBody[] = [
            new AllPagesBody(wikiLink),
            new AllFilesBody(wikiLink),
            new UploadFileBody(wikiLink),
        ];
        for (const special of specials) {
            if (special.name === wikiLink.name) {
                return special;
            }
        }

        const specialPages: SpecialPagesBody = new SpecialPagesBody(wikiLink);
        if (specialPages.name === wikiLink.name) {
            for (const special of specials) {
                specialPages.addSpecialContentBody(special);
            }
            return specialPages;
        }

        return new NotFoundSpecialBody(wikiLink);
    }
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
        ];
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
        ];
        return lines.join('');
    }
}

// Page
class NotFoundPageBody extends ContentBody {
    public get html(): string {
        const path: string = this.wikiLink.toPath();
        return `<p>There is currently no text in this page. You can <a class="internal" href="?path=${path}&mode=edit">create this page</a>.</p>`;
    }
}

class PageEditBody extends ContentBody {
    public get html(): string {
        const mainEditAreaId: string = 'markdown-edit-area';
        const lines: string[] = [
            '<div class="row">',
              '<div class="col-12">',
                '<div id="preview-alert" class="alert alert-warning d-none" role="alert">',
                  '<strong>Remember that this is only a preview.</strong>',
                  `Your changes have not yet been saved! <a href="#${mainEditAreaId}"> → Go to editing area</a>`,
                '</div>',
                '<div class="row">',
                  '<div id="preview-wrapper" class="col-12"></div>',
                '</div>',
                '<div class="row mb-2">',
                  '<div class="col-12">',
                    `<textarea id="${mainEditAreaId}" class="form-control"></textarea>`,
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
    public get html(): string {
        // TODO: ImageFileHandler, PDFFileHandler
        const filepath: string = toFullPath(this.wikiLink.toPath()) as string;
        const markdown: string = fs.readFileSync(filepath, 'utf-8');
        return PageReadBody.markdownToHtml(markdown);
    }

    public static markdownToHtml(markdown: string): string {
        const wmd: WikiMD = new WikiMD({isWikiLink: WikiLink.isWikiLink});
        /* wmd.addMagicHandler(new ImageFileHandler()); */
        /* wmd.addMagicHandler(new PDFFileHandler()); */
        wmd.setValue(markdown);
        let htmlText: string = wmd.toHTML();
        return PageReadBody.replaceInternalSrc(htmlText);
    }

    public static replaceInternalSrc(html: string): string {
        const PATTERN_WITH_GLOBAL: RegExp = /src="\?path=[^"]+"/g;
        const match: RegExpMatchArray|null = html.match(PATTERN_WITH_GLOBAL);
        if (match === null) {
            return html;
        }
        const PATTERN: RegExp = /src="(\?path=([^"]+))"/;
        for (const m of match) {
            const srcMatch: RegExpMatchArray|null = m.match(PATTERN);
            if (srcMatch === null) {
                continue;
            }
            const src: string = srcMatch[0];
            const path: string = srcMatch[2];
            const fullPath: string|null = toFullPath(path);
            if (fullPath === null) {
                continue;
            }
            html = html.replace(src, `src="${fullPath}"`);
        }
        return html;
    }
}


class PageHistoryBody extends ContentBody {
    public get html(): string {
        const lines: string[] = [];
        lines.push('Diff selection: Mark the radio boxes of the revisions to compare and click the button at the bottom.');
        lines.push('Legend: (cur) = difference with latest revision, (prev) = difference with preceding revision.');
        lines.push('<div class="row pb-2 pt-2">');
        lines.push(  '<div class="col-3">');
        lines.push(    '<button type="button" id="compare-versions-button" class="btn btn-outline-secondary btn-block">Compare selected versions</button>');
        lines.push(  '</div>');
        lines.push('</div>');
        /* lines.push('<div class="row">'); */
        lines.push(this.historyList());
        /* lines.push('</div>'); */
        return lines.join('');
    }

    private historyList(): string {
        const history: WikiHistory = WikiHistoryFactory.create(this.wikiLink.namespace, this.wikiLink.type);
        const currentData: VersionData = history.getByName(this.wikiLink.name);
        const historyData: VersionData[] = history.getPrevOf(currentData.id);
        const lines: string[] = [];
        lines.push('<div class="page-history">');
        lines.push('<ol>');
        for (let i = 0, len = historyData.length; i < len; i++) {
            const data: VersionData = historyData[i];
            lines.push(this.li(data, i));
        }
        lines.push('</ol>');
        lines.push('</div>');
        return lines.join('');
    }

    private li(data: VersionData, index: number): string {
        const separator: string = '<span class="separator"></span>';
        const className: string = this.liClassNames(index).join(' ');
        const lines: string[] = [];
        lines.push(`<li class="${className}">`);
        lines.push(this.curAndPrev(data));
        lines.push(this.radios(data, index));
        lines.push('<span class="changed-date">');
        const href: string = `?path=${this.wikiLink.toPath()}&version=${data.version}`;
        lines.push(`<a href="${href}">${this.dateToStr(data.created)}</a>`);
        lines.push('</span>');
        if (data.comment !== '') {
            lines.push(separator);
            lines.push(`<span class="comment">${data.comment}</span>`);
        }
        lines.push('</li>');
        return lines.join('');
    }

    private liClassNames(index: number): string[] {
        if (index === 0) {
            return ['before', 'selected'];
        }
        if (index === 1) {
            return ['after', 'selected'];
        }
        return ['after'];
    }

    private curAndPrev(data: VersionData): string {
        const path: string = this.wikiLink.toPath();
        const lines: string[] = [];
        const v: number = data.version;
        lines.push('<span class="cur-and-prev">');
        lines.push('<span>');
        lines.push(data.next === null ? 'cur' : `<a href="?path=Special:PageDiff&page=${path}&old=${v}">cur</a>`);
        lines.push('</span>');

        lines.push('<span>');
        lines.push(data.prev === null ? 'prev' : `<a href="?path=Special:PageDiff&page=${path}&old=${v-1}&diff=${v}">prev</a>`);
        lines.push('</span>');
        lines.push('</span>');
        return lines.join('');
    }

    private radios(data: VersionData, index: number): string {
        const checked: {old: boolean, diff: boolean} = this.radioChecked(index);
        const lines: string[] = [];
        if (checked.old) {
            lines.push(`<input type="radio" name="old" value="${data.version}" checked>`);
        } else {
            lines.push(`<input type="radio" name="old" value="${data.version}">`);
        }
        if (checked.diff) {
            lines.push(`<input type="radio" name="diff" value="${data.version}" checked>`);
        } else {
            lines.push(`<input type="radio" name="diff" value="${data.version}">`);
        }
        return lines.join('');
    }

    private radioChecked(index: number): {old: boolean, diff: boolean} {
        const checked: {old: boolean, diff: boolean} = {old: false, diff: false};
        if (index === 0) {
            checked.diff = true;
        }
        if (index === 1) {
            checked.old = true;
        }
        return checked;
    }


    private dateToStr(date: Date): string {
        const h: string = zeroPadding(date.getHours(), 2);
        const i: string = zeroPadding(date.getMinutes(), 2);
        const d: string = zeroPadding(date.getDate(), 2);
        const m: string = [
            'January'  , 'February', 'March'   , 'April',
            'May'      , 'June'    , 'July'    , 'August',
            'September', 'October' , 'November', 'December'
        ][date.getMonth()];
        const y: string = zeroPadding(date.getFullYear(), 4);
        return `${h}:${i}, ${d} ${m} ${y}`;
    }
}


// File
class FileReadBody extends ContentBody {
    private readonly bufferPathGenerator: BufferPathGenerator;
    public constructor(wikiLink: WikiLink) {
        super(wikiLink);
        this.bufferPathGenerator = BufferPathGeneratorFactory.create(wikiLink.namespace, wikiLink.type);
    }

    public get html(): string {
        const filepath: string = toFullPath(this.wikiLink.toPath()) as string;
        const uplaodLink: WikiLink = new WikiLink({namespace: this.wikiLink.namespace, type: 'Special', name: 'UploadFile'});
        const uplaodHref: string = `?path=${uplaodLink.toPath()}&dest=${this.wikiLink.name}`;
        const lines: string[] = [
            '<div class="row">',
              '<div class="col-12">',
                `<img src="${filepath}" alt="16" decoding="async">`,
              '</div>',
            '</div>',
            this.historyHtml(),
            '<div class="row">',
              '<div class="col-12 pb-4">',
                `<a href="${uplaodHref}">Upload a new version of this file</a>`,
              '</div>',
            '</div>'

        ]
        return lines.join('');
    }

    private historyHtml(): string {
        const lines = [
            '<div class="row">',
              '<div class="col-12">',
                '<h2>history</h2>',
                '<table class="w-100">',
                  this.thead(),
                  this.tbody(),
                '</table>',
              '</div>',
            '</div>',
        ]
        return lines.join('');
    }

    private thead(): string {
          const lines: string[] = [
              '<thead>',
                '<tr>',
                  `<th style="width: 7em;"></th>`,
                  `<th style="width: 15em;">Date/Time</th>`,
                  `<th style="width: 15em;">Thumbnail</th>`,
                  '<th style="width: 15em;">Size</th>',
                  `<th>Comment</th>`,
                '</tr>',
              '</thead>'
          ]
          return lines.join('');
    }

    private tbody(): string {
        const history: WikiHistory = WikiHistoryFactory.create(this.wikiLink.namespace, this.wikiLink.type);
        const currentData: VersionData = history.getByName(this.wikiLink.name);
        const historyData: VersionData[] = history.getPrevOf(currentData.id);
        return '<tbody>' + historyData.reduce((value, data) => value + this.tr(data), '') + '</tbody>';
    }

    private tr(data: VersionData): string {
        const status: string = data.next === null ? 'current' : 'revert';
        const created: string = date2str(data.created);
        const src: string = this.bufferPathGenerator.execute(data.filename);
        const comment: string = data.comment;
        const size: string = bytes2str(fs.statSync(src).size);
        const lines: string[] = [
            '<tr>',
              `<td>${status}</td>`,
              `<td>${created}</td>`,
              '<td>',
                `<img src="${src}" alt="${data.name}" decoding="async">`,
              '</td>',
              `<td>${size}</td>`,
              `<td>${comment}</td>`,
            '</tr>',
        ]
        return lines.join('');
    }
}

// Special
class NotFoundSpecialBody extends ContentBody {
    public get html(): string {
        const lines: string[] = [
            '<div class="alert alert-warning" role="alert">',
              'The Page you are looking for doesn\'t exist or an other error occurred.<br>',
              `Choose a new direction, or Go to <a href="?path=${this.wikiLink.namespace}:Special:SpecialPages">Special:SpecialPages.</a>`,
            '</div>',
        ];
        return lines.join('');
    }
}


type SpecialContentType = 'Lists of pages'|'Media reports and uploads'|'Others';

abstract class SpecialContentBody extends ContentBody {
    public abstract name: string;
    public abstract title: string;
    public abstract type: SpecialContentType;
}


class SpecialPagesBody extends SpecialContentBody {
    private readonly specialContentBodies: SpecialContentBody[];

    public constructor(wikiLink: WikiLink) {
        super(wikiLink);
        this.specialContentBodies = [];
        this.addSpecialContentBody(this);
    }

    public addSpecialContentBody(contentBody: SpecialContentBody): void {
        this.specialContentBodies.push(contentBody);
    }

    public name: string = 'SpecialPages';
    public type: SpecialContentType = 'Others';
    public title: string = 'Special pages';

    public get html(): string {
        const lines: string[] = [];
        const contentTypes: SpecialContentType[] = ['Lists of pages', 'Media reports and uploads', 'Others'];
        for (const contentType of contentTypes) {
            const contentBodies: SpecialContentBody[] = this.specialContentBodies.filter(contentBody => contentBody.type === contentType);
            if (contentBodies.length === 0) {
                continue;
            }
            lines.push(`<h2>${contentType}</h2>`);
            lines.push('<ul>');
            for (const contentBody of contentBodies) {
                const title: string = contentBody.title;
                const wikiLink: WikiLink = new WikiLink({namespace: this.wikiLink.namespace, type: 'Special', name: contentBody.name});
                const path: string = wikiLink.toPath();
                lines.push(`<li><a href="?path=${path}">${title}</a></li>`);
            }
            lines.push('</ul>');
        }
        return lines.join('');
    }
}


class AllPagesBody extends SpecialContentBody {
    public name: string = 'AllPages';
    public title: string = 'All pages';
    public type: SpecialContentType = 'Lists of pages';

    public get html(): string {
        const history: WikiHistory = WikiHistoryFactory.create(this.wikiLink.namespace, 'Page');
        const currentData: VersionData[] = history.getCurrentList();

        const lines: string[] = [
            '<p>This special page shows all created pages.</p>'
        ];
        if (currentData.length !== 0) {
            lines.push('<ul>');
            const namespace: string = this.wikiLink.namespace;
            const wikiType: WikiType = 'Page';
            for (const data of currentData) {
                const dataLink: WikiLink = new WikiLink({namespace, name: data.name, type: wikiType});
                lines.push(`<li><a href="?path=${dataLink.toPath()}">${data.name}</a></li>`);
            }
            lines.push('</ul>');
        }
        return lines.join('');
    }
}


class AllFilesBody extends SpecialContentBody {
    public name: string = 'AllFiles';
    public title: string = 'All files';
    public type: SpecialContentType = 'Media reports and uploads';

    public get html(): string {
        const wl: WikiLink = new WikiLink(this.wikiLink)
        const history: WikiHistory = WikiHistoryFactory.create(wl.namespace, 'File');
        const currentData: VersionData[] = history.getCurrentList();

        const lines: string[] = [
            '<p>This special page shows all uploaded files.</p>'
        ];
        if (currentData.length !== 0) {
            lines.push('<ul>');
            const namespace: string = this.wikiLink.namespace;
            const wikiType: WikiType = 'File';
            for (const data of currentData) {
                const dataLink: WikiLink = new WikiLink({namespace, name: data.name, type: wikiType});
                lines.push(`<li><a href="?path=${dataLink.toPath()}">${data.name}</a></li>`);
            }
            lines.push('</ul>');
        }
        return lines.join('');
    }
}


class UploadFileBody extends SpecialContentBody {
    public name: string = 'UploadFile';
    public title: string = 'Upload file';
    public type: SpecialContentType = 'Media reports and uploads';

    public get html(): string {
        const lines: string[] = [
            '<div class="border rounded p-3">',
              '<div class="form-group">',
                '<label for="choose-file-button">Source filename: </label>',
                '<div class="input-group">',
                  '<div class="input-group-prepend">',
                    '<button id="choose-file-button" class="form-control btn btn-outline-secondary">Choose File</button>',
                  '</div>',
                  '<div class="input-group-append">',
                    '<label id="chosen-filepath" for="choose-file-button" class="form-control">No file chosen</label>',
                  '</div>',
                '</div>',
                `<small class="form-text text-muted">Permitted file types: <span id="permitted-extensions"></span>.</small>`,
              '</div>',
              '<div class="form-group">',
                '<label for="destination-filename">Destination filename: </label>',
                '<input type="text" id="destination-filename" class="form-control" placeholder="Filename">',
              '</div>',
              '<div class="form-group">',
                '<label for="upload-comment">Comment: </label>',
                '<input type="text" id="upload-comment" class="form-control" placeholder="Comment">',
              '</div>',
              '<button type="submit" id="upload-button" class="btn btn-outline-primary">Upload file</button>',
            '</div>',
        ];
        return lines.join('');
    }
}


export {ContentGenerator, PageReadBody};
