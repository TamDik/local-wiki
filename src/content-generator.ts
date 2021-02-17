import * as fs from 'fs';
import * as path from 'path';
import {dateToStr, bytesToStr, zeroPadding} from './utils';
import {WikiConfig} from './wikiconfig';
import {WikiHistoryFactory, BufferPathGeneratorFactory} from './wikihistory-factory';
import {BufferPathGenerator, WikiHistory, VersionData} from './wikihistory';
import {WikiLink} from './wikilink';
import {WikiMD, ImageFileHandler, PDFFileHandler} from './markdown';


function toFullPath(path: string, version?: number): string|null {
    const wl: WikiLink = new WikiLink(path)
    const namespace: string = wl.namespace;
    const wikiType: WikiType = wl.type;
    const name: string = wl.name;
    const history: WikiHistory = WikiHistoryFactory.create(namespace, wikiType);
    if (!history.hasName(name)) {
        return null;
    }
    let data: VersionData = history.getByName(name);
    if (typeof(version) === 'number') {
        if (version > data.version || version < 1) {
            return null;
        }
        data = history.getByVersion(name, version);
    }
    return BufferPathGeneratorFactory.create(namespace, wikiType).execute(data.filename);
};


function existsVersion(path: string, version: number): boolean {
    const wl: WikiLink = new WikiLink(path)
    const history: WikiHistory = WikiHistoryFactory.create(wl.namespace, wl.type);
    const name: string = wl.name;
    if (!history.hasName(name)) {
        return false;
    }
    return version > 0 && version <= history.getByName(name).version;
}


class ContentGenerator {
    public static title(mode: PageMode, wikiLink: WikiLink): string {
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

    public static menuTabs(mode: PageMode, wikiLink: WikiLink): TabParams[] {
        const path: string = wikiLink.toPath();
        switch (wikiLink.type) {
            case 'Page':
                return [
                    {title: 'Read'   , href: `?path=${path}&mode=read`   , selected: mode === 'read'},
                    {title: 'Edit'   , href: `?path=${path}&mode=edit`   , selected: mode === 'edit'},
                    {title: 'History', href: `?path=${path}&mode=history`, selected: mode === 'history'},
                ];
            case 'File':
            case 'Special':
                return [];
        }
    }

    public static mainContent(mode: PageMode, wikiLink: WikiLink, version?: number): {body: string, dependences: {js: string[], css: string[]}} {
        const contentBody: ContentBody = ContentGenerator.dispatchContentBody(mode, wikiLink, version);
        return {body: contentBody.html, dependences: {js: contentBody.js, css: contentBody.css}};
    }

    private static dispatchContentBody(mode: PageMode, wikiLink: WikiLink, version: number|undefined): ContentBody {
        let dispatcher: ContentBodyDispatcher;
        const config: WikiConfig = new WikiConfig();

        // 名前空間なし
        if (!config.hasNameSpace(wikiLink.namespace)) {
            return new NotFoundNameSpaceBody(wikiLink);
        }

        // typeごと
        switch (wikiLink.type) {
            case 'Page':
                if (typeof(version) === 'undefined') {
                    dispatcher = ContentGenerator.createPageDispatcher(wikiLink);
                } else if (existsVersion(wikiLink.toPath(), version)) {
                    return new PageWithVersionReadBody(wikiLink, version);
                } else {
                    return new NotFoundPageWithVersionReadBody(wikiLink, version);
                }
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
            new SearchBody(wikiLink),
            new AllFilesBody(wikiLink),
            new UploadFileBody(wikiLink),
            new PageDiffBody(wikiLink),
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
    public css: string[] = [];
    public js: string[] = [];

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
        return `<p>There is currently no text in this page. You can <a href="?path=${path}&mode=edit">create this page</a>.</p>`;
    }
}

class PageEditBody extends ContentBody {
    public css: string[] = ['./css/editor.css'];
    public js: string[] = ['./js/editor.js'];

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
                  '<div class="col-2 offset-4">',
                    '<button type="button" id="page-edit-save-button" class="btn btn-primary btn-block">Save</button>',
                  '</div>',
                  '<div class="col-2">',
                    '<button type="button" id="page-edit-preview-button" class="btn btn-outline-secondary btn-block">Preview</button>',
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

class NotFoundPageWithVersionReadBody extends ContentBody {
    public constructor(wikiLink: WikiLink, private readonly version: number) {
        super(wikiLink);
    }

    public get html(): string {
        const lines: string[] = [
            '<div class="alert alert-danger" role="alert">',
              `The revision #${this.version} of the page named "${this.wikiLink.toPath()}" does not exist.`,
            '</div>'
        ];
        return lines.join('');
    }
}

class PageWithVersionReadBody extends PageReadBody {
    public constructor(wikiLink: WikiLink, private readonly version: number) {
        super(wikiLink);
    }

    public get html(): string {
        const filepath: string = toFullPath(this.wikiLink.toPath(), this.version) as string;
        const markdown: string = fs.readFileSync(filepath, 'utf-8');
        return this.versionAlert() + PageReadBody.markdownToHtml(markdown);
    }

    private versionAlert(): string {
        const history: WikiHistory = WikiHistoryFactory.create(this.wikiLink.namespace, this.wikiLink.type);
        const data: VersionData = history.getByVersion(this.wikiLink.name, this.version);
        const latestVersion: number = history.getByName(this.wikiLink.name).version;
        const lines: string[] = [
            '<div class="alert alert-warning" role="alert">',
              'Revision as of ' + dateToStr(data.created),
              '<br>',
              this.revisionLine(data, latestVersion),
            '</div>',
        ];
        return lines.join('');
    }

    private revisionLine(data: VersionData, latestVersion: number): string {
        const DIFF: string = 'diff';
        const SEPARATOR: string = ' | ';
        const lines: string[] = []
        lines.push(this.oldRevisionLine(data, DIFF));
        lines.push(SEPARATOR);
        lines.push(this.latestRevisionLine(data, latestVersion, DIFF));
        lines.push(SEPARATOR);
        lines.push(this.newRevisionLine(data, DIFF));
        return lines.join('');
    }

    private oldRevisionLine(data: VersionData, DIFF: string): string {
        const OLD_VERSION: string = '← Older revision';
        const lines: string[] = [];
        if (data.prev !== null) {
            lines.push(this.surround(this.diffLink(this.version - 1, this.version, DIFF)));
            lines.push(' ');
            lines.push(this.versionLink(data.version - 1, OLD_VERSION));
        } else {
            lines.push(this.surround(DIFF));
            lines.push(' ');
            lines.push(OLD_VERSION);
        }
        return lines.join('');
    }

    private latestRevisionLine(data: VersionData, latestVersion: number, DIFF: string): string {
        const LATEST_VERSION: string = 'Latest revision';
        const lines: string[] = [];
        if (data.next !== null) {
            lines.push(this.versionLink(latestVersion, LATEST_VERSION));
            lines.push(' ');
            lines.push(this.surround(this.diffLink(this.version, latestVersion, DIFF)));
        } else {
            lines.push(LATEST_VERSION);
            lines.push(' ');
            lines.push(this.surround(DIFF));
        }
        return lines.join('');
    }

    private newRevisionLine(data: VersionData, DIFF: string): string {
        const lines: string[] = [];
        const NEW_VERSION: string = 'Newer revision →';
        if (data.next !== null) {
            lines.push(this.versionLink(data.version + 1, NEW_VERSION));
            lines.push(' ');
            lines.push(this.surround(this.diffLink(this.version, this.version + 1, DIFF)));
        } else {
            lines.push(NEW_VERSION);
            lines.push(' ');
            lines.push(this.surround(DIFF));
        }
        return lines.join('');
    }

    private versionLink(version: number, text: string): string {
        return `<a href="?path=${this.wikiLink.toPath()}&version=${version}">${text}</a>`;
    }

    private surround(text: string): string {
        return '(' + text + ')';
    }

    private diffLink(old: number, diff: number, text: string): string {
        const href: string = PageDiffBody.toDiffLink(this.wikiLink, old, diff);
        return `<a href="${href}">${text}</a>`;
    }
}

class PageHistoryBody extends ContentBody {
    public css: string[] = ['./css/page-history.css'];
    public js: string[] = ['./js/page-history.js'];

    public get html(): string {
        const lines: string[] = [];
        lines.push('Diff selection: Mark the radio boxes of the revisions to compare and click the button at the bottom.');
        lines.push('<div>');
        lines.push(  'Legend: (cur) = difference with latest revision, (prev) = difference with preceding revision.');
        lines.push('</div>');
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
            lines.push(this.li(data, i, currentData.version));
        }
        lines.push('</ol>');
        lines.push('</div>');
        return lines.join('');
    }

    private li(data: VersionData, index: number, currentVersion: number): string {
        const separator: string = '<span class="separator"></span>';
        const className: string = this.liClassNames(index).join(' ');
        const lines: string[] = [];
        lines.push(`<li class="${className}">`);
        lines.push(this.curAndPrev(data, currentVersion));
        lines.push(this.radios(data, index));
        lines.push('<span class="changed-date">');
        const href: string = `?path=${this.wikiLink.toPath()}&version=${data.version}`;
        lines.push(`<a href="${href}">${dateToStr(data.created)}</a>`);
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

    private curAndPrev(data: VersionData, currentVersion: number): string {
        const path: string = this.wikiLink.toPath();
        const lines: string[] = [];
        const v: number = data.version;
        lines.push('<span class="cur-and-prev">');
        lines.push('<span>');
        const curHref: string = PageDiffBody.toDiffLink(this.wikiLink, v, currentVersion);
        lines.push(data.next === null ? 'cur' : `<a href="${curHref}">cur</a>`);
        lines.push('</span>');

        lines.push('<span>');
        const prevHref: string = PageDiffBody.toDiffLink(this.wikiLink, v - 1, v);
        lines.push(data.prev === null ? 'prev' : `<a href="${prevHref}">prev</a>`);
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
        const created: string = dateToStr(data.created);
        const src: string = this.bufferPathGenerator.execute(data.filename);
        const comment: string = data.comment;
        const size: string = bytesToStr(fs.statSync(src).size);
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


const specialContentLabels = {
    pages: 'Lists of pages',
    media: 'Media reports and uploads',
    redirect: 'Redirecting special pages',
    others: 'Others'
};

type SpecialContentType = keyof typeof specialContentLabels;


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
    public type: SpecialContentType = 'others';
    public title: string = 'Special pages';

    public get html(): string {
        const lines: string[] = [];
        for (const [contentType, label] of Object.entries(specialContentLabels)) {
            const contentBodies: SpecialContentBody[] = this.specialContentBodies.filter(contentBody => contentBody.type === contentType);
            if (contentBodies.length === 0) {
                continue;
            }
            lines.push(`<h2>${label}</h2>`);
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
    public type: SpecialContentType = 'pages';

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
    public type: SpecialContentType = 'media';

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
    public js: string[] = ['./js/upload-file.js'];
    public name: string = 'UploadFile';
    public title: string = 'Upload file';
    public type: SpecialContentType = 'media';

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


class PageDiffBody extends SpecialContentBody {
    private static wikiName: string = 'PageDiff';
    public name: string = PageDiffBody.wikiName;
    public title: string = 'differences';
    public type: SpecialContentType = 'others';

    public css: string[] = ['./css/page-diff.css'];
    public js: string[] = [
        '../node_modules/jsdifflib/index.js',
        './js/code-table.js',
        './js/page-diff.js'
    ];

    public static toDiffLink(wikiLink: WikiLink, old: number, diff: number): string {
        const path: string = `Special:${PageDiffBody.wikiName}`;
        const page: string = wikiLink.toPath();
        return `?path=${path}&page=${page}&old=${old}&diff=${diff}`;
    }

    public get html(): string {
        const oldPrefix: string = 'old-page';
        const newPrefix: string = 'new-page';
        const lines: string[] = [
            '<div class="border rounded p-3">',
              `<label for="${this.pathId(newPrefix)}">New version page:</label>`,
              this.pathAndVersion(newPrefix),
              `<label for="${this.pathId(oldPrefix)}">Old revision page:</label>`,
              this.pathAndVersion(oldPrefix),
              this.showButton(),
            '</div>',
            '<div id="differences-wrapper"></div>',
        ];
        return lines.join('');
    }

    private pathId(prefix: string): string {
        return `${prefix}-path`;
    }

    private versionId(prefix: string): string {
        return `${prefix}-version`;
    }

    private pathAndVersion(prefix: string): string {
        const pathId: string = this.pathId(prefix);
        const versionId: string = this.versionId(prefix);
        const lines: string[] = [
            '<div class="form-row">',
              '<div class="col-3">',
                '<div class="input-group mb-3">',
                  '<div class="input-group-prepend">',
                    `<label class="input-group-text" for="${pathId}">Path</label>`,
                  '</div>',
                  `<input type="text" id="${pathId}" class="form-control" placeholder="[Namespace:]Name">`,
                '</div>',
              '</div>',

              '<div class="col-3">',
                '<div class="input-group mb-3">',
                  '<div class="input-group-prepend">',
                    `<label class="input-group-text" for="${versionId}">Version</label>`,
                  '</div>',
                  `<input type="text" id="${versionId}" class="form-control" value="the path is invalid" disabled>`,
                '</div>',
              '</div>',
            '</div>',
        ];
        return lines.join('');
    }

    private showButton(): string {
        const lines: string[] = [
            '<div class="row pt-1">',
              '<div class="col-2 offset">',
                '<button type="button" id="show-differences-button" class="btn btn-outline-primary btn-block" disabled>Show differences</button>',
              '</div>',
            '</div>',
        ];
        return lines.join('');

    }
}


class SearchBody extends SpecialContentBody {
    public js: string[] = ['./js/search-page.js'];
    public css: string[] = ['./css/search-page.css'];
    public name: string = 'Search';
    public title: string = 'Search';
    public type: SpecialContentType = 'pages';

    public get html(): string {
        const lines: string[] = [
            '<div class="row pb-3">',
              '<div class="col-6">',
                '<div class="input-group">',
                  '<input id="search-keyword-field" class="form-control" type="search" placeholder="Search">',
                  '<div class="input-group-append">',
                    '<button id="search-page-button" class="btn btn-outline-primary">Search</button>',
                  '</div>',
                '</div>',
              '</div>',
            '</div>',
            '<div class="row">',
              '<div class="col-12" id="search-result-wrapper">',
              '</div>',
            '</div>'
        ]
        return lines.join('');
    }
}


export {ContentGenerator, PageReadBody};
