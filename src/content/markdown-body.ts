import * as fs from 'fs';
import * as markdown from './markdown';
import {isInteger, escapeHtml, dateToStr} from '../utils';
import {WikiLocation} from '../wikilink';
import {WikiMarkdown} from '../markdown/markdown';
import {ContentBody} from './content-body';
import {toFullPath, WikiHistory, VersionData, createHistory} from '../wikihistory-builder';
import {PageDiffBody} from './special-body';
import {EmojiReplacer} from '../markdown/emoji';


class MarkdownEditorBody extends ContentBody {
    public css: string[] = [
        '../node_modules/simplemde/dist/simplemde.min.css',
        './css/editor.css',
        ...markdown.css,
    ];
    public js: string[] = [
        '../node_modules/simplemde/dist/simplemde.min.js',
        './js/renderer/editor.js',
        ...markdown.js,
    ];
    private section: string = '';

    public get html(): string {
        const filepath: string|null = toFullPath(this.wikiLink, null, true);
        if (filepath === null) {
            return this.textArea();
        }
        const markdown: string|null = this.escapedMarkdown(filepath);
        if (markdown === null) {
            return this.errorMessage();
        } else {
            return this.textArea(markdown);
        }
    }

    private escapedMarkdown(filepath: string): string|null {
        const markdown: WikiMarkdown = new WikiMarkdown(fs.readFileSync(filepath, 'utf-8'), this.wikiLink);
        if (this.section === '') {
            return escapeHtml(markdown.getRawText());
        }
        if (!isInteger(this.section)) {
            return null;
        }
        const section: number = Number(this.section);
        if (section < 0 || section > markdown.getMaxSection()) {
            return null;
        }
        return escapeHtml(markdown.getSection(section));
    }


    public applyParamerters(parameters: {[key: string]: string}): void {
        if ('section' in parameters) {
            this.section = parameters['section'];
        }
    }

    private errorMessage(): string {
        const location: WikiLocation = new WikiLocation(this.wikiLink);
        return '<p>You tried to edit a section that does not exist.' +
                `Return to <a href="${location.toURI()}">${this.wikiLink.name}.</a></p>`;
    }

    private textArea(markdown: string=''): string {
        const mainEditAreaId: string = 'markdown-edit-area';
        const lines: string[] = [
            '<div class="row">',
              '<div class="col-12">',
                '<div id="preview-alert" class="alert alert-warning d-none" role="alert">',
                  '<strong>Remember that this is only a preview.</strong>',
                  `Your changes have not yet been saved! <a id="go-to-edit-area" href="#${mainEditAreaId}"> → Go to editing area</a>`,
                '</div>',
                '<div class="row">',
                  '<div id="preview-wrapper" class="col-12"></div>',
                '</div>',
                '<div class="row mb-2 mt-3">',
                  '<div class="col-12">',
                    `<textarea id="${mainEditAreaId}" class="form-control">${markdown}</textarea>`,
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


class MarkdownHistoryBody extends ContentBody {
    public css: string[] = ['./css/page-history.css'];
    public js: string[] = ['./js/renderer/page-history.js'];

    public get html(): string {
        const lines: string[] = [];
        lines.push(this.header());
        const history: WikiHistory = this.createHistory();
        if (history.hasName(this.wikiLink.name)) {
            const currentData: VersionData = history.getByName(this.wikiLink.name);
            const historyData: VersionData[] = history.getPrevOf(currentData.id);
            lines.push(this.diffButton(historyData.length < 2));
            lines.push(this.historyList(currentData, historyData));
        } else {
            lines.push(this.diffButton(true));
        }
        return lines.join('');
    }

    protected createHistory(): WikiHistory {
        return createHistory(this.wikiLink.namespace, this.wikiLink.type, true);
    }

    private header(): string {
        const lines: string[] = [];
        lines.push('Diff selection: Mark the radio boxes of the revisions to compare and click the button at the bottom.');
        lines.push('<div>');
        lines.push(  'Legend: (cur) = difference with latest revision, (prev) = difference with preceding revision.');
        lines.push('</div>');
        return lines.join('');
    }

    private historyList(currentData: VersionData, historyData: VersionData[]): string {
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

    private diffButton(disabled: boolean): string {
        const lines: string[] = [];
        lines.push('<div class="row pb-2 pt-2">');
        lines.push(  '<div class="col-3">');
        if (disabled) {
            lines.push('<button type="button" id="compare-versions-button" class="btn btn-outline-secondary btn-block" disabled>Compare selected versions</button>');
        } else {
            lines.push('<button type="button" id="compare-versions-button" class="btn btn-outline-secondary btn-block">Compare selected versions</button>');
        }
        lines.push(  '</div>');
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
            const emojiReplacer: EmojiReplacer = new EmojiReplacer('apple');
            const text: string = emojiReplacer.replace(data.comment);
            lines.push(`<span class="comment">${text}</span>`);
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


export {MarkdownEditorBody, MarkdownHistoryBody};
