import * as fs from 'fs';
import * as path from 'path';
import {extensionOf, dateToStr, bytesToStr, zeroPadding} from './utils';
import {fileTypeOf} from './wikifile';
import {WikiConfig, MergedNamespaceConfig} from './wikiconfig';
import {WikiHistoryFactory, BufferPathGeneratorFactory} from './wikihistory-factory';
import {BufferPathGenerator, WikiHistory, VersionData} from './wikihistory';
import {WikiLink, WikiLocation, DEFAULT_NAMESPACE} from './wikilink';
import {WikiMD, FileHandler, ImageFileHandler, PDFFileHandler} from './markdown';


function toFullPath(wikiLink: WikiLink, version?: number): string|null {
    const namespace: string = wikiLink.namespace;
    const wikiType: WikiType = wikiLink.type;
    const name: string = wikiLink.name;

    const config: WikiConfig = new WikiConfig();
    if (!config.hasNamespace(namespace)) {
        return null;
    }

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


function existsVersion(wikiLink: WikiLink, version: number): boolean {
    const history: WikiHistory = WikiHistoryFactory.create(wikiLink.namespace, wikiLink.type);
    const name: string = wikiLink.name;
    if (!history.hasName(name)) {
        return false;
    }
    return version > 0 && version <= history.getByName(name).version;
}


class ContentGenerator {
    public static sideMenu(): string {
        return SideMenuGenerator.html;
    }

    public static title(mode: PageMode, wikiLink: WikiLink): string {
        const path: string = wikiLink.toPath();
        switch (mode) {
            case 'read':
                return path;
            case 'edit':
                return `editing ${path}`
            case 'history':
                return `Revision history of "${path}"`;
        }
    }

    public static menuTabs(mode: PageMode, wikiLink: WikiLink): TopNavTabData[] {
        switch (wikiLink.type) {
            case 'Page':
                const readLoc: WikiLocation = new WikiLocation(wikiLink);
                const editLoc: WikiLocation = new WikiLocation(wikiLink);
                const histLoc: WikiLocation = new WikiLocation(wikiLink);
                readLoc.addParam('mode', 'read');
                editLoc.addParam('mode', 'edit');
                histLoc.addParam('mode', 'history');
                return [
                    {title: 'Read'   , href: readLoc.toURI(), selected: mode === 'read'},
                    {title: 'Edit'   , href: editLoc.toURI(), selected: mode === 'edit'},
                    {title: 'History', href: histLoc.toURI(), selected: mode === 'history'},
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
        const config: WikiConfig = new WikiConfig();

        // 名前空間なし
        if (!config.hasNamespace(wikiLink.namespace)
            && !(wikiLink.type === 'Special' && wikiLink.name === NewNamespaceBody.wikiName)) {
            return new NotFoundNamespaceBody(wikiLink);
        }

        // typeごと
        switch (wikiLink.type) {
            case 'Page':
                return ContentGenerator.createPageContentBody(wikiLink, mode, version);
            case 'File':
                return ContentGenerator.createFileContentBody(wikiLink, version);
            case 'Special':
                return ContentGenerator.createSpecialContentBody(wikiLink);
        }
    }

    private static createPageContentBody(wikiLink: WikiLink, mode: PageMode, version: number|undefined): ContentBody {
        const history: WikiHistory = WikiHistoryFactory.create(wikiLink.namespace, wikiLink.type);
        if (!history.hasName(wikiLink.name)) {
            return new NotFoundPageContentBodyDispatcher(wikiLink).execute(mode);
        }

        if (typeof(version) === 'undefined') {
            return new PageContentBodyDispatcher(wikiLink).execute(mode);
        }

        if (existsVersion(wikiLink, version)) {
            return new PageWithVersionReadBody(wikiLink, version);
        } else {
            return new NotFoundPageWithVersionReadBody(wikiLink, version);
        }
    }

    private static createFileContentBody(wikiLink: WikiLink, version: number|undefined): ContentBody {
        const history: WikiHistory = WikiHistoryFactory.create(wikiLink.namespace, wikiLink.type);
        if (!history.hasName(wikiLink.name)) {
            return new NotFoundFileBody(wikiLink);
        }

        if (typeof(version) === 'undefined') {
            return new FileReadBody(wikiLink);
        }

        if (existsVersion(wikiLink, version)) {
            return new FileWithVersionReadBody(wikiLink, version);
        } else {
            return new NotFoundFileWithVersionReadBody(wikiLink, version);
        }
    }

    public static specialContentBodies(wikiLink: WikiLink): SpecialContentBody[] {
        const specialPages: SpecialPagesBody = new SpecialPagesBody(wikiLink);
        const specials: SpecialContentBody[] = [
            specialPages,
            new AllPagesBody(wikiLink),
            new SearchBody(wikiLink),
            new AllFilesBody(wikiLink),
            new UploadFileBody(wikiLink),
            new PageDiffBody(wikiLink),
            new SideMenuBody(wikiLink),
            new NamespacePreferencesBody(wikiLink),
            new AllNamespacesBody(wikiLink),
            new NewNamespaceBody(wikiLink),
        ];
        for (const special of specials) {
            specialPages.addSpecialContentBody(special);
        }
        return specials;
    }

    private static createSpecialContentBody(wikiLink: WikiLink): ContentBody {
        for (const special of ContentGenerator.specialContentBodies(wikiLink)) {
            if (special.name === wikiLink.name) {
                return special;
            }
        }
        return new NotFoundSpecialBody(wikiLink);
    }
}


// -----------------------------------------------------------------------------
// SideMenuGenerator
// -----------------------------------------------------------------------------
class SideMenuGenerator {
    public static get html(): string {
        const config: WikiConfig = new WikiConfig();
        const {main, sub} = config.getSideMenu();
        const lines: string[] = [];
        lines.push(SideMenuGenerator.mainSection(main));
        for (const {title, data} of sub) {
            lines.push(SideMenuGenerator.subSection(title, data));
        }
        return lines.join('');
    }

    private static mainSection(data: SideMenuSectionData): string {
        return [
        '<nav id="wiki-side-main">',
          '<ul class="menu-contents">',
            SideMenuGenerator.menuContents(data),
          '</ul>',
        '</nav>'
        ].join('');
    }

    private static subSection(title: string, data: SideMenuSectionData): string {
         return [
            '<nav class="wiki-side-sub">',
              `<h3 class="wiki-side-label">${title}</h3>`,
              '<ul class="menu-contents">',
                SideMenuGenerator.menuContents(data),
              '</ul>',
            '</nav>',
        ].join('');
    }

    private static menuContents(data: SideMenuSectionData): string {
        const lines: string[] = [];
        lines.push('<ul class="menu-contents">');
        for (const content of data) {
            lines.push('<li>');
            if (content.type === 'text') {
                lines.push(SideMenuGenerator.text(content.value));
            } else if (content.type === 'link') {
                lines.push(SideMenuGenerator.link(content.text, content.path));
            }
            lines.push('</li>');
        }
        lines.push('</ul>');
        return lines.join('');
    }

    private static text(value: string): string {
        return value;
    }

    private static link(text: string, path: string): string {
        let href: string = path;
        if (WikiLink.isWikiLink(path)) {
            href = new WikiLocation(new WikiLink(path)).toURI();
        }
        return `<a href="${href}">${text}</a>`;
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
    protected abstract createReadContentBody(wikiLink: WikiLink): ContentBody;
    protected abstract createEditContentBody(wikiLink: WikiLink): ContentBody;
    protected abstract createHistoryContentBody(wikiLink: WikiLink): ContentBody;
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

class NotFoundNamespaceBody extends ContentBody {
    public get html(): string {
        const href: string = NewNamespaceBody.createURI(this.wikiLink.namespace);
        const lines: string[] = [
            '<div class="alert alert-warning" role="alert">',
              'The namespace you are looking for doesn\'t exist or an other error occurred.<br>',
              `Choose a new direction, or you can <a href="${href}">create this namespace.</a>`,
            '</div>',
        ];
        return lines.join('');
    }
}

// Page
class NotFoundPageBody extends ContentBody {
    public get html(): string {
        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('mode', 'edit');
        return `<p>There is currently no text in this page. You can <a href="${location.toURI()}">create this page</a>.</p>`;
    }
}

class PageEditBody extends ContentBody {
    public css: string[] = [
        './css/editor.css',
        '../node_modules/highlight.js/styles/github-gist.css',
    ];
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
    public css: string[] = [
        '../node_modules/highlight.js/styles/github-gist.css',
    ];
    public get html(): string {
        const filepath: string = toFullPath(this.wikiLink) as string;
        const markdown: string = fs.readFileSync(filepath, 'utf-8');
        return PageReadBody.markdownToHtml(markdown, this.wikiLink.namespace);
    }

    public static markdownToHtml(markdown: string, baseNamespace: string): string {
        function toWikiURI(href: string): string {
            const wikiLink: WikiLink = new WikiLink(href, baseNamespace);
            const location: WikiLocation = new WikiLocation(wikiLink);
            return location.toURI();
        }

        const wikiMD: WikiMD = new WikiMD({toWikiURI, isWikiLink: WikiLink.isWikiLink});

        // file
        const fileHandler: FileHandler = new FileHandler((path: string) => new WikiLink(path, baseNamespace).type === 'File');
        wikiMD.addMagicHandler(fileHandler);

        // image
        fileHandler.addHandler(new ImageFileHandler(
            (path: string) => {
                const fullPath: string|null = toFullPath(new WikiLink(path, baseNamespace));
                return typeof(fullPath) === 'string' && fileTypeOf(fullPath) === 'image';
            },
            toWikiURI
        ));

        // pdf
        fileHandler.addHandler(new PDFFileHandler(
            (path: string) => {
                const fullPath: string|null = toFullPath(new WikiLink(path, baseNamespace));
                return typeof(fullPath) === 'string' && fileTypeOf(fullPath) === 'pdf';
            },
            toWikiURI
        ));

        wikiMD.setValue(markdown);
        let htmlText: string = wikiMD.toHTML();
        return PageReadBody.expandWikiLink(htmlText, baseNamespace);
    }

    private static expandWikiLink(html: string, baseNamespace: string): string {
        html = PageReadBody.expandInternalFileLink(html, 'img', 'src', 'error', baseNamespace);
        html = PageReadBody.expandInternalFileLink(html, 'object', 'data', 'error', baseNamespace);
        return html;
    }

    private static expandInternalFileLink(html: string, tagName: string, prop: string, replace: string|null, baseNamespace: string): string {
        const PATTERN: RegExp = new RegExp(`(?<=<${tagName} [^>]*${prop}=")\\?path=[^"]+(?=")`, 'g');
        html = html.replace(PATTERN, s => {
            const wikiPath: string = s.slice(6);
            const wikiLink: WikiLink = new WikiLink(wikiPath, baseNamespace);
            if (wikiLink.type !== 'File') {
                return replace === null ? s : replace;
            }
            const fullPath: string|null = toFullPath(wikiLink);
            if (fullPath === null) {
                return replace === null ? s : replace;
            }
            return fullPath;
        });
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
        const filepath: string = toFullPath(this.wikiLink, this.version) as string;
        const markdown: string = fs.readFileSync(filepath, 'utf-8');
        return this.versionAlert() + PageReadBody.markdownToHtml(markdown, this.wikiLink.namespace);
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
        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('version', String(version));
        return `<a href="${location.toURI()}">${text}</a>`;
    }

    private surround(text: string): string {
        return '(' + text + ')';
    }

    private diffLink(old: number, diff: number, text: string): string {
        const href: string = PageDiffBody.createURI(this.wikiLink, old, diff);
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

        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('version', String(data.version));
        lines.push(`<a href="${location.toURI()}">${dateToStr(data.created)}</a>`);
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
        const lines: string[] = [];
        const version: number = data.version;
        lines.push('<span class="cur-and-prev">');
        lines.push('<span>');
        const curHref: string = PageDiffBody.createURI(this.wikiLink, version, currentVersion);
        lines.push(data.next === null ? 'cur' : `<a href="${curHref}">cur</a>`);
        lines.push('</span>');

        lines.push('<span>');
        const prevHref: string = PageDiffBody.createURI(this.wikiLink, version - 1, version);
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
class NotFoundFileBody extends ContentBody {
    public get html(): string {
        const href: string = UploadFileBody.createURI(this.wikiLink);
        return `<p>There is currently no file in this page. You can <a href="${href}">upload this file</a>.</p>`;
    }
}


class FileReadBody extends ContentBody {
    private readonly bufferPathGenerator: BufferPathGenerator;

    public constructor(wikiLink: WikiLink) {
        super(wikiLink);
        this.bufferPathGenerator = BufferPathGeneratorFactory.create(wikiLink.namespace, wikiLink.type);
    }

    public get html(): string {
        return this.createHtml();
    }

    protected createHtml(version?: number): string {
        const href: string = UploadFileBody.createURI(this.wikiLink);
        const lines: string[] = [
            '<div class="row">',
              '<div class="col-12">',
                this.mainView(version),
              '</div>',
            '</div>',
            this.historyHtml(),
            '<div class="row">',
              '<div class="col-12 pb-4">',
                `<a href="${href}">Upload a new version of this file</a>`,
              '</div>',
            '</div>',
        ]
        return lines.join('');
    }

    private mainView(version: number|undefined): string {
        const filepath: string = toFullPath(this.wikiLink, version) as string;
        switch (fileTypeOf(filepath)) {
            case 'image':
                return `<img src="${filepath}" alt="preview" decoding="async">`
            case 'pdf':
                return [
                    `<object style="width: 100%; height: calc(100vh - 300px);" type="application/pdf" data="${filepath}">`,
                      '<div class="alert alert-warning">',
                        '<p>Could not be displayed. </p>',
                      '</div>',
                    '</object>'
                ].join('');
            case 'other':
                return '';
        }
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
        const filepath: string = this.bufferPathGenerator.execute(data.filename);
        const size: string = bytesToStr(fs.statSync(filepath).size);

        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('version', String(data.version));
        const lines: string[] = [
            '<tr>',
              `<td>${status}</td>`,
              `<td><a href="${location.toURI()}">${created}</a></td>`,
              '<td>',
                this.thumbTd(filepath, data.version),
              '</td>',
              `<td>${size}</td>`,
              `<td>${data.comment}</td>`,
            '</tr>',
        ]
        return lines.join('');
    }

    private thumbTd(filepath: string, version: number): string {
        let content: string = '';
        switch (fileTypeOf(filepath)) {
            case 'image':
                content = `<img src="${filepath}" alt="version ${version}" decoding="async">`;
                break;
            case 'pdf':
                content = `PDF (version ${version})`;
                break;
            case 'other':
                content = `version ${version}`;
                break;
        }
        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('version', String(version));
        return `<a href="${location.toURI()}">${content}</a>`
    }
}


class FileWithVersionReadBody extends FileReadBody {
    public constructor(wikiLink: WikiLink, private readonly version: number) {
        super(wikiLink);
    }

    public get html(): string {
        return this.versionAlert() + super.createHtml(this.version);
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
        const SEPARATOR: string = ' | ';
        const lines: string[] = []
        lines.push(this.oldRevisionLine(data));
        lines.push(SEPARATOR);
        lines.push(this.latestRevisionLine(data, latestVersion));
        lines.push(SEPARATOR);
        lines.push(this.newRevisionLine(data));
        return lines.join('');
    }

    private oldRevisionLine(data: VersionData): string {
        const OLD_VERSION: string = '← Older revision';
        const lines: string[] = [];
        if (data.prev !== null) {
            lines.push(this.versionLink(data.version - 1, OLD_VERSION));
        } else {
            lines.push(OLD_VERSION);
        }
        return lines.join('');
    }

    private latestRevisionLine(data: VersionData, latestVersion: number): string {
        const LATEST_VERSION: string = 'Latest revision';
        const lines: string[] = [];
        if (data.next !== null) {
            lines.push(this.versionLink(latestVersion, LATEST_VERSION));
        } else {
            lines.push(LATEST_VERSION);
        }
        return lines.join('');
    }

    private newRevisionLine(data: VersionData): string {
        const lines: string[] = [];
        const NEW_VERSION: string = 'Newer revision →';
        if (data.next !== null) {
            lines.push(this.versionLink(data.version + 1, NEW_VERSION));
        } else {
            lines.push(NEW_VERSION);
        }
        return lines.join('');
    }

    private versionLink(version: number, text: string): string {
        const location: WikiLocation = new WikiLocation(this.wikiLink);
        location.addParam('version', String(version));
        return `<a href="${location.toURI()}">${text}</a>`;
    }
}


class NotFoundFileWithVersionReadBody extends ContentBody {
    public constructor(wikiLink: WikiLink, private readonly version: number) {
        super(wikiLink);
    }

    public get html(): string {
        const lines: string[] = [
            '<div class="alert alert-danger" role="alert">',
              `The revision #${this.version} of the file named "${this.wikiLink.toPath()}" does not exist.`,
            '</div>'
        ];
        return lines.join('');
    }
}


// Special
class NotFoundSpecialBody extends ContentBody {
    public get html(): string {
        const wikiLink: WikiLink = new WikiLink(
            {namespace: this.wikiLink.namespace, type: 'Special', name: SpecialPagesBody.wikiName}
        );
        const location: WikiLocation = new WikiLocation(wikiLink);
        const lines: string[] = [
            '<div class="alert alert-warning" role="alert">',
              'The Page you are looking for doesn\'t exist or an other error occurred.<br>',
              `Choose a new direction, or Go to <a href="${location.toURI()}">Special:SpecialPages.</a>`,
            '</div>',
        ];
        return lines.join('');
    }
}


const specialContentLabels = {
    namespace: 'Namespace',
    pages: 'Lists of pages',
    media: 'Media reports and uploads',
    redirect: 'Redirecting special pages',
    others: 'Others'
};

type SpecialContentType = keyof typeof specialContentLabels;


abstract class SpecialContentBody extends ContentBody {
    public readonly abstract name: string;
    public readonly abstract title: string;
    public readonly abstract type: SpecialContentType;
}


class SpecialPagesBody extends SpecialContentBody {
    private readonly specialContentBodies: SpecialContentBody[];

    public constructor(wikiLink: WikiLink) {
        super(wikiLink);
        this.specialContentBodies = [];
    }

    public addSpecialContentBody(contentBody: SpecialContentBody): void {
        this.specialContentBodies.push(contentBody);
    }

    public static readonly wikiName: string = 'SpecialPages';
    public name: string = SpecialPagesBody.wikiName;
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
                if (contentBody === this) {
                    lines.push(`<li>${title}</li>`);
                } else {
                    const wikiLink: WikiLink = new WikiLink({namespace: this.wikiLink.namespace, type: 'Special', name: contentBody.name});
                    const location: WikiLocation = new WikiLocation(wikiLink);
                    lines.push(`<li><a href="${location.toURI()}">${title}</a></li>`);
                }
            }
            lines.push('</ul>');
        }
        return lines.join('');
    }
}


class AllPagesBody extends SpecialContentBody {
    public static wikiName: string = 'AllPages';
    public name: string = AllPagesBody.wikiName;
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
                const wikiLink: WikiLink = new WikiLink({namespace, name: data.name, type: wikiType});
                const location: WikiLocation = new WikiLocation(wikiLink);
                lines.push(`<li><a href="${location.toURI()}">${data.name}</a></li>`);
            }
            lines.push('</ul>');
        }
        return lines.join('');
    }
}


class AllFilesBody extends SpecialContentBody {
    public static wikiName: string = 'AllFiles';
    public name: string = AllFilesBody.wikiName;
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
                const wikiLink: WikiLink = new WikiLink({namespace, name: data.name, type: wikiType});
                const location: WikiLocation = new WikiLocation(wikiLink);
                lines.push(`<li><a href="${location.toURI()}">${data.name}</a></li>`);
            }
            lines.push('</ul>');
        }
        return lines.join('');
    }
}


class UploadFileBody extends SpecialContentBody {
    private static readonly wikiName: string = 'UploadFile';
    public name: string = UploadFileBody.wikiName;
    public js: string[] = ['./js/upload-file.js'];
    public title: string = 'Upload file';
    public type: SpecialContentType = 'media';

    public static createURI(wikiLink: WikiLink): string {
        const location: WikiLocation = new WikiLocation(
            new WikiLink({namespace: wikiLink.namespace, type: 'Special', name: UploadFileBody.wikiName})
        );
        location.addParam('dest', wikiLink.name);
        return location.toURI();
    }

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
    private static readonly wikiName: string = 'PageDiff';
    public name: string = PageDiffBody.wikiName;
    public title: string = 'differences';
    public type: SpecialContentType = 'others';

    public css: string[] = ['./css/page-diff.css'];
    public js: string[] = [
        '../node_modules/jsdifflib/index.js',
        './js/code-table.js',
        './js/page-diff.js'
    ];

    public static createURI(wikiLink: WikiLink, old: number, diff: number): string {
        const location: WikiLocation = new WikiLocation(
            new WikiLink({type: 'Special', name: PageDiffBody.wikiName})
        );
        location.addParam('page', wikiLink.toPath());
        location.addParam('old', String(old));
        location.addParam('diff', String(diff));
        return location.toURI();
    }

    public get html(): string {
        const oldPrefix: string = 'old-page';
        const newPrefix: string = 'new-page';
        const lines: string[] = [
            '<div class="border rounded p-3">',
              `<label for="${this.pathId(newPrefix)}">New version page:</label>`,
              this.pathAndVersion(newPrefix),
              `<label for="${this.pathId(oldPrefix)}">Old version page:</label>`,
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


class SideMenuBody extends SpecialContentBody {
    public css: string[] = ['./css/side-menu.css'];
    public js: string[] = [
        '../node_modules/sortablejs/Sortable.min.js',
        './js/side-menu.js'
    ];
    public name: string = 'SideMenu';
    public title: string = 'Side menu';
    public type: SpecialContentType = 'others';
    public get html(): string {
        const lines: string[] = [
            '<h3>Main</h3>',
            '<div id="main-side-menu-section">',
              '<div class="list-group side-menu-contents"></div>',
            '</div>',
            '<div class="d-flex align-items-end mt-3 mb-1">',
              '<h3 class="d-inline m-0">Sub Sections</h3>',
              '<button class="btn btn-outline-secondary ml-3" id="add-section-button">add</button>',
            '</div>',
            '<div id="side-menu-sections"></div>',
            '<div class="row mt-3">',
              '<div class="col-2">',
                '<button class="btn btn-outline-primary btn-block" id="save-side-menu-button">Save</button>',
              '</div>',
            '</div>',
        ];
        return lines.join('');
    }
}


class NamespacePreferencesBody extends SpecialContentBody {
    public static readonly wikiName: string = 'NamespacePreferences';
    public readonly name: string = NamespacePreferencesBody.wikiName;
    public readonly title: string = 'Namespace preferences';
    public readonly type: SpecialContentType = 'namespace';
    public readonly js: string[] = [
        './js/namespace-preferences.js'
    ];
    public readonly css: string[] = [
        './css/namespace-preferences.css'
    ];

    public get html(): string {
        const config: MergedNamespaceConfig = new WikiConfig().getNamespaceConfig(this.wikiLink.namespace, {id: true, name: true});

        const canvasId: string = 'namespace-icon-canvas';
        const imgId: string = 'namespace-icon-image';

        const lines: string[] = [
            '<div class="border rounded p-3">',
              this.nameInput(config),
              '<div id="namespace-name-alert" class="alert alert-danger d-none" role="alert">',
                'The namespace is already in use!',
              '</div>',
              '<div class="form-group">',
                `<label>ID:</label>`,
                `<input type="text" id="namespace-id" class="form-control" value="${config.id}" readonly>`,
              '</div>',
              '<div class="form-group">',
                `<label>Icon:</label>`,
                '<div>',
                  `<canvas class="border" id="${canvasId}" width="200" height="200"></canvas>`,
                  `<img class="border d-none" src="${config.iconPath}" id="${imgId}"></img>`,
                '</div>',
              '</div>',
              '<div class="form-group">',
                `<label>Type:</label>`,
                `<input type="text" class="form-control" value="${config.type}" readonly>`,
              '</div>',
              this.direcotrySelection(config),
              '<button type="submit" id="save-namespace-button" class="btn btn-outline-primary">Save</button>',
            '</div>',
        ];
        return lines.join('');
    }

    private nameInput(config: MergedNamespaceConfig): string {
        const nameId: string = 'new-namespace-name';
        const lines: string[] = [];
        lines.push('<div class="form-group">');
        lines.push(`<label for="${nameId}">Namespace:</label>`);
        if (config.name === DEFAULT_NAMESPACE) {
            lines.push(`<input type="text" id="${nameId}" class="form-control" value="${config.name}" readonly>`);
            lines.push(`<small class="form-text text-muted">"${DEFAULT_NAMESPACE}" is the default namespace and cannot be changed.</small>`)
        } else {
            lines.push(`<input type="text" id="${nameId}" class="form-control" placeholder="Namespace" value="${config.name}">`);
        }
        lines.push('</div>');
        return lines.join('');
    }

    private direcotrySelection(config: MergedNamespaceConfig): string {
        if (config.type === 'internal') {
            return '';
        }
        const lines: string[] = [
            '<div class="form-group">',
              `<label>Directory:</label>`,
              `<input type="text" class="form-control" value="${config.rootDir}" readonly>`,
            '</div>',
        ];
        return lines.join('');
    }
}


class AllNamespacesBody extends SpecialContentBody {
    public name: string = 'AllNamespaces';
    public title: string = 'All namespaces';
    public type: SpecialContentType = 'namespace';

    public get html(): string {
        const lines: string[] = [
            '<p>This special page shows all created namespaces.</p>'
        ];
        const config: WikiConfig = new WikiConfig();
        const namespaceConfigs: MergedNamespaceConfig[] = config.getNamespaces();
        const internals: MergedNamespaceConfig[] = namespaceConfigs.filter(config => config.type === 'internal');
        const externals: MergedNamespaceConfig[] = namespaceConfigs.filter(config => config.type === 'external');
        if (internals.length !== 0) {
            lines.push('<h2>Internal namespaces</h2>');
            lines.push(this.namespaceList(internals));
        }
        if (externals.length !== 0) {
            lines.push('<h2>External namespaces</h2>');
            lines.push(this.namespaceList(externals));
        }
        return lines.join('');
    }

    private namespaceList(configs: MergedNamespaceConfig[]): string {
        const lines: string[] = [];
        lines.push('<ul>');
        for (const config of configs) {
            lines.push(`<li>${config.name} (` + this.namespaceLinks(config) + ')</li>');
        }
        lines.push('</ul>');
        return lines.join('');
    }

    private namespaceLinks(config: MergedNamespaceConfig): string {
        const lines: string[] = [];
        const names: string[] = [
            SpecialPagesBody.wikiName,
            AllPagesBody.wikiName,
            AllFilesBody.wikiName,
            NamespacePreferencesBody.wikiName,
        ];
        for (const name of names) {
            const wikiLink: WikiLink = new WikiLink({namespace: config.name, type: 'Special', name});
            const location: WikiLocation = new WikiLocation(wikiLink);
            lines.push(`<a href="${location.toURI()}">${name}</a>`);
        }
        return lines.join(', ');
    }
}


class NewNamespaceBody extends SpecialContentBody {
    public static readonly wikiName: string = 'NewNamespace';
    public name: string = NewNamespaceBody.wikiName;
    public title: string = 'New namespace';
    public type: SpecialContentType = 'namespace';
    public js: string[] = [
        './js/new-namespace.js'
    ];
    public css: string[] = [
        './css/new-namespace.css'
    ];

    public static createURI(namespace: string): string {
        const location: WikiLocation = new WikiLocation(
            new WikiLink({type: 'Special', name: NewNamespaceBody.wikiName})
        );
        location.addParam('new', namespace);
        return location.toURI();
    }

    public get html(): string {
        const lines: string[] = [
            '<div class="border rounded p-3">',
              this.iconRow(),
              this.nameRow(),
              this.typeRow(),
              this.directoryRow(),
              '<button type="submit" id="create-namespace-button" class="btn btn-outline-primary" disabled>Create</button>',
            '</div>',
        ];
        return lines.join('');
    }

    private iconRow(): string {
        const iconId: string = 'namespace-icon-canvas';
        const lines: string[] = [
            '<div class="form-group">',
              `<label>Icon:</label>`,
              '<div>',
                `<canvas class="border" id="${iconId}" width="200" height="200"></canvas>`,
              '</div>',
            '</div>',
            this.iconWarning(),
        ];
        return lines.join('');
    }

    private nameRow(): string {
        const nameId: string = 'new-namespace-name';
        const lines: string[] = [
            '<div class="form-group">',
              `<label for="${nameId}">Namespace:</label>`,
              '<div>',  // NOTE: disabled のときに click イベントを検知するために wrap している
                `<input type="text" id="${nameId}" class="form-control" placeholder="Namespace">`,
              '</div>',
            '</div>',
            this.namespaceWarning(),
            this.namespaceAlert(),
        ];
        return lines.join('');
    }

    private typeRow(): string {
        const typeId: string = 'new-namespace-type';
        const lines: string[] = [
            '<div class="form-group">',
              `<label for="${typeId}">Type:</label>`,
              `<select id="${typeId}" class="form-control">`,
                '<option value="internal" selected>Internal</option>',
                '<option value="external">External</option>',
              '</select>',
            '</div>',
        ];
        return lines.join('');
    }

    private directoryRow(): string {
        const dirId: string = 'external-namespace-directory';
        const dirButonId: string = 'external-namespace-directory-button';
        const lines: string[] = [
            '<div class="form-group">',
              `<label for="${dirId}">Directory (for external):</label>`,
              '<div class="input-group">',
                '<div class="input-group-prepend">',
                  `<button id="${dirButonId}" class="form-control btn btn-outline-secondary" disabled>Choose Directory</button>`,
                '</div>',
                '<div class="input-group-append">',
                  `<label id="${dirId}" for="${dirButonId}" class="form-control">No direcotry chosen</label>`,
                '</div>',
              '</div>',
            '</div>',
        ];
        return lines.join('');
    }

    private iconWarning(): string {
        return this.warning('the icon', 'namespace-icon-warning');
    }

    private namespaceWarning(): string {
        return this.warning('the namespace', 'namespace-name-warning');
    }

    private warning(target: string, id: string): string {
        const lines: string[] = [
            `<div id="${id}" class="alert alert-warning alert-dismissible d-none">`,
              'The specified directory is being used as a namespace. ',
              `You cannot change ${target} here. `,
              `Visit "<span class="namespace-preferences-wikilink"></span>" after creation!`,
              '<button type="button" class="close">&times;</button>',
            '</div>',
        ];
        return lines.join('');
    }

    private namespaceAlert(): string {
        const lines: string[] = [
            '<div id="namespace-name-alert" class="alert alert-danger d-none" role="alert">',
              'The namespace is already in use!',
            '</div>',
        ];
        return lines.join('');
    }
}


export {ContentGenerator, PageReadBody};
