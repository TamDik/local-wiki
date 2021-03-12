import * as fs from 'fs';
import {dateToStr, bytesToStr} from '../utils';
import {fileTypeOf} from '../wikifile';
import {NotFoundVersionBody, WithVersionBody} from './version-body';
import * as markdown from './markdown';
import {toFullPath, WikiHistory, createHistory, VersionData} from '../wikihistory-builder';
import {WikiLink, WikiLocation} from '../wikilink';
import {ContentBody, ContentBodyDispatcher} from './content-body';
import {MarkdownEditorBody, MarkdownHistoryBody} from './markdown-body';
import {UploadFileBody} from './special-body';


class FileContentBodyDispatcher extends ContentBodyDispatcher {
    protected readContentBody(wikiLink: WikiLink): ContentBody {
        return new FileReadBody(wikiLink);
    }

    protected editContentBody(wikiLink: WikiLink): ContentBody {
        return new MarkdownEditorBody(wikiLink);
    }

    protected historyContentBody(wikiLink: WikiLink): ContentBody {
        return new MarkdownHistoryBody(wikiLink);
    }

    protected contentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody {
        return new FileWithVersionReadBody(wikiLink, version);
    }

    protected notFoundReadContentBody(wikiLink: WikiLink): ContentBody {
        return new NotFoundFileBody(wikiLink);
    }

    protected notFoundContentWithVersionBody(wikiLink: WikiLink, version: number): ContentBody {
        return new NotFoundVersionBody(wikiLink, version);
    }
}


class FileWithVersionReadBody extends WithVersionBody {
    public js: string[] = [
        ...markdown.js,
    ];
    public css: string[] = [
        ...markdown.css,
    ];

    protected mainContent(version: number): string {
        const filepath: string = toFullPath(this.wikiLink, version, true) as string;
        const text: string = fs.readFileSync(filepath, 'utf-8');
        return markdown.parse(text, this.wikiLink);
    }
}

class NotFoundFileBody extends ContentBody {
    public get html(): string {
        const href: string = UploadFileBody.createURI(this.wikiLink);
        return `<p>There is currently no file in this page. You can <a href="${href}">upload this file</a>.</p>`;
    }
}

class FileReadBody extends ContentBody {
    public js: string[] = [
        ...markdown.js,
    ];
    public css: string[] = [
        ...markdown.css,
    ];

    public constructor(wikiLink: WikiLink, private readonly version?: number) {
        super(wikiLink);
    }

    public get html(): string {
        const href: string = UploadFileBody.createURI(this.wikiLink);
        const lines: string[] = [
            this.mainView(this.version),
            this.pageHtml(),
            this.historyHtml(),
            `<a href="${href}">Upload a new version of this file</a>`,
        ]
        return lines.join('');
    }

    protected pageHtml(): string {
        const history: WikiHistory = createHistory(this.wikiLink.namespace, this.wikiLink.type, true);
        if (!history.hasName(this.wikiLink.name)) {
            return '';
        }
        let data: VersionData = history.getByName(this.wikiLink.name);
        const text: string = fs.readFileSync(data.filepath, 'utf-8');
        return markdown.parse(text, this.wikiLink);
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
            '<h2>history</h2>',
            '<table class="w-100">',
              this.thead(),
              this.tbody(),
            '</table>',
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
        const history: WikiHistory = createHistory(this.wikiLink.namespace, this.wikiLink.type);
        const currentData: VersionData = history.getByName(this.wikiLink.name);
        const historyData: VersionData[] = history.getPrevOf(currentData.id);
        return '<tbody>' + historyData.reduce((value, data) => value + this.tr(data), '') + '</tbody>';
    }

    private tr(data: VersionData): string {
        const status: string = data.next === null ? 'current' : 'revert';
        const created: string = dateToStr(data.created);
        const filepath: string = data.filepath;
        const size: string = bytesToStr(fs.statSync(filepath).size);

        const lines: string[] = [
            '<tr>',
              `<td>${status}</td>`,
              `<td>${created}</td>`,
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
        switch (fileTypeOf(filepath)) {
            case 'image':
                return `<img src="${filepath}" alt="version ${version}" decoding="async">`;
            case 'pdf':
                return `PDF (version ${version})`;
            case 'other':
                return `version ${version}`;
        }
    }
}


export {FileContentBodyDispatcher};
