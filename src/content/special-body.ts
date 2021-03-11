import {ContentBody, IContentBodyDispatcher} from './content-body';
import {WikiConfig, MergedNamespaceConfig} from '../wikiconfig';
import {Category} from '../wikicategory';
import {createHistory, WikiHistory, VersionData} from '../wikihistory-builder';
import {WikiLink, WikiLocation, DEFAULT_NAMESPACE} from '../wikilink';


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


class SpecialContentBodyDispatcher implements IContentBodyDispatcher {
    public constructor(private readonly wikiLink: WikiLink) {
    }

    public static specialContentBodies(wikiLink: WikiLink): SpecialContentBody[] {
        const specialPages: SpecialPagesBody = new SpecialPagesBody(wikiLink);
        const specials: SpecialContentBody[] = [
            specialPages,
            new AllPagesBody(wikiLink),
            new SearchBody(wikiLink),
            new CategoriesBody(wikiLink),
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

    public execute(): ContentBody {
        for (const special of SpecialContentBodyDispatcher.specialContentBodies(this.wikiLink)) {
            if (special.name === this.wikiLink.name) {
                return special;
            }
        }
        return new NotFoundSpecialBody(this.wikiLink);
    }
}


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
        const history: WikiHistory = createHistory(this.wikiLink.namespace, 'Page');
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
        const history: WikiHistory = createHistory(this.wikiLink.namespace, 'File');
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
    public js: string[] = ['./js/renderer/upload-file.js'];
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
        './js/renderer/code-table.js',
        './js/renderer/page-diff.js'
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
    public js: string[] = ['./js/renderer/search-page.js'];
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

class CategoriesBody extends SpecialContentBody {
    public static wikiName: string = 'Categories';
    public name: string = CategoriesBody.wikiName;
    public title: string = 'Categories';
    public type: SpecialContentType = 'pages';

    public get html(): string {
        const lines: string[] = [
            '<p>The following category exists.</p>'
        ];
        const categories: Category[] = Category.allUnder(this.wikiLink.namespace);

        if (categories.length !== 0) {
            lines.push('<ul>');
            const namespace: string = this.wikiLink.namespace;
            for (const category of categories) {
                const wikiLink: WikiLink = category.toWikiLink();
                const location: WikiLocation = new WikiLocation(wikiLink);
                lines.push(`<li><a href="${location.toURI()}">${wikiLink.name}</a></li>`);
            }
            lines.push('</ul>');
        }
        return lines.join('');
    }
}


class SideMenuBody extends SpecialContentBody {
    public css: string[] = ['./css/side-menu.css'];
    public js: string[] = [
        '../node_modules/sortablejs/Sortable.min.js',
        './js/renderer/side-menu.js'
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
        './js/renderer/namespace-preferences.js'
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
        './js/renderer/new-namespace.js'
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


export {SpecialContentBody, SpecialContentBodyDispatcher, NewNamespaceBody, UploadFileBody, PageDiffBody, CategoriesBody};
