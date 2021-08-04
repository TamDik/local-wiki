const DEFAULT_MODE: PageMode = 'read';
const DEFAULT_PATH: string = 'Main';

type ContextualClass = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

function createAlertMessage(innerHTML: string, context: ContextualClass): HTMLDivElement {
    const alertDiv: HTMLDivElement = document.createElement('div');
    alertDiv.classList.add('alert', 'alert-' + context);
    alertDiv.innerHTML = innerHTML;
    return alertDiv;
}

class Params {
    private params: URLSearchParams;
    private static readonly MODE_KEY: string = 'mode';
    private static readonly PATH_KEY: string = 'path';
    public constructor() {
        const url: URL = new URL(location.href);
        this.params = url.searchParams;
    }

    public get mode(): PageMode {
        const key: string = Params.MODE_KEY;
        let value: string|null = this.params.get(key);
        if (value === null) {
            return DEFAULT_MODE;
        }
        value = window.utils.trim(value);
        if (window.localWiki.isMode(value)) {
            return value;
        }
        return DEFAULT_MODE;
    }

    public get path(): string {
        const key: string = Params.PATH_KEY;
        let value: string|null = this.params.get(key);
        if (value === null) {
            return DEFAULT_PATH;
        }
        value = window.utils.trim(value);
        if (value === '') {
            return DEFAULT_PATH;
        }
        return value;
    }

    public get namespace(): string {
        return window.localWiki.parsePath(this.path).namespace;
    }

    public get type(): WikiType {
        return window.localWiki.parsePath(this.path).type;
    }

    public get name(): string {
        return window.localWiki.parsePath(this.path).name;
    }

    public getValueOf(key: string): string {
        if (key === Params.MODE_KEY) {
            return this.mode;
        }
        if (key === Params.PATH_KEY) {
            return this.path;
        }
        let value: string|null = this.params.get(key);
        if (value === null) {
            return '';
        }
        return window.utils.trim(value);
    }

    public get optionalKeys(): string[] {
        const keys: string[] = [];
        for (const key of this.params.keys()) {
            if (key === Params.PATH_KEY) {
                continue;
            }
            if (keys.includes(key)) {
                continue;
            }
            keys.push(key);
        }
        return keys;
    }
}


class View {
    private static actions: (() => void)[] = [];

    public static addUpdateAction(action: () => void): void {
        View.actions.push(action);
    }

    public static update(): void {
        for (const action of View.actions) {
            action();
        }
    }
}


function initMainIcon(src: string, namespace: string): void {
    const mainLogo: HTMLDivElement = document.getElementById('main-logo') as HTMLDivElement;
    const anchor: HTMLAnchorElement = document.createElement('a');
    anchor.href = window.localWiki.toURI({namespace});
    const img: HTMLImageElement = document.createElement('img');
    img.src = src;
    img.alt = namespace;
    anchor.appendChild(img);
    mainLogo.appendChild(anchor);
}


function initTabs(namespace: string, tabs: TopNavTabData[]) {
    const manespaceTab: HTMLLIElement = document.getElementById('namespace-tab') as HTMLLIElement;
    manespaceTab.innerHTML = `<a href="#">${namespace}</a>`;

    const searchTab: HTMLLIElement = document.getElementById('search-tab') as HTMLLIElement;
    for (const tab of tabs) {
        const {title, href, selected} = tab;
        const li: HTMLLIElement = document.createElement('li');
        searchTab.before(li);
        const a: HTMLAnchorElement = document.createElement('a');
        li.appendChild(a);
        a.href = href;
        a.innerText = title;
        if (selected) {
            li.classList.add('selected');
        }
    }
    const searchField: HTMLInputElement = document.getElementById('search-field') as HTMLInputElement;
    searchField.addEventListener('keypress', (event: KeyboardEvent) => {
        if (event.which === 13) {
            event.preventDefault();
            location.href = window.localWiki.toURI({namespace, type: 'Special', name: 'Search'}, {search: searchField.value});
        }
    });
}


function initAccessArea(params: Params) {
    const {path, mode} = params;
    const accessField: HTMLInputElement = document.getElementById('access-field') as HTMLInputElement;
    const accessParams: string = params.optionalKeys.filter(key => !(key === 'mode' && mode === DEFAULT_MODE))
                                                    .map(key => `${key}=${params.getValueOf(key)}`)
                                                    .join('&');
    if (accessParams !== '') {
        accessField.value = `${path}?${accessParams}`
    } else {
        accessField.value = path;
    }

    accessField.addEventListener('keypress', (event: KeyboardEvent) => {
        if (event.which === 13) {
            event.preventDefault();
            const fieldValues: string[] = accessField.value.split('?');
            const path: string = window.utils.trim(fieldValues[0]);
            const params: {[key: string]: string} = {};
            if (fieldValues.length > 1) {
                for (const param of window.utils.trim(fieldValues[1]).split('&')) {
                    const [key, value, ..._] = param.split('=');
                    params[key] = value;
                }
            }
            location.href = window.localWiki.toURI(path, params);
        }
    });

    const goBackButton: HTMLButtonElement = document.getElementById('go-back-button') as HTMLButtonElement;
    const goForwardButton: HTMLButtonElement = document.getElementById('go-forward-button') as HTMLButtonElement;
    const reloadButton: HTMLButtonElement = document.getElementById('reload-button') as HTMLButtonElement;
    window.ipcApi.canGoBackOrForward()
    .then(({back, forward}) => {
        goBackButton.disabled = !back;
        goForwardButton.disabled = !forward;
    });

    goBackButton.addEventListener('click', () => {
        window.ipcApi.goBack();
    }, false);

    goForwardButton.addEventListener('click', () => {
        window.ipcApi.goForward();
    }, false);

    reloadButton.addEventListener('click', () => {
        window.ipcApi.reload();
    });
}


function linkCSS(href: string): void {
    const linkTag: HTMLLinkElement = document.createElement('link');
    linkTag.rel = 'stylesheet';
    linkTag.type = 'text/css';
    linkTag.href = href;
    document.head.appendChild(linkTag);
}

function importJS(src: string): void{
    const request: XMLHttpRequest = new XMLHttpRequest();
    request.open('GET', src, false);
    request.send(null);
    if (request.status === 200) {
        const script: HTMLScriptElement = document.createElement('script');
        script.text = request.responseText;
        document.head.appendChild(script);
    }
}

async function getMainContent(params: Params): Promise<{namespaceIcon: string, title: string, body: string, sideMenu: string, tabs: TopNavTabData[],
                                                        dependences: {css: string[], js: string[]}}> {
    const version: string = params.getValueOf('version');
    const optionals: {[key: string]: string} = {};
    for (const key of params.optionalKeys) {
        optionals[key] = params.getValueOf(key);
    }
    if (window.utils.isNaturalNumber(version)) {
        return window.ipcApi.getMainContent(params.mode, params.path, optionals, Number(version));
    } else {
        return window.ipcApi.getMainContent(params.mode, params.path, optionals);
    }
}

function isExternalLink(href: string): boolean {
    return href.startsWith('http');
}

function markAnchorTags(): void {
    const INTERNAL_CLASS = 'internal';
    const EXTERNAL_CLASS = 'external';
    const selector: string = `a:not(.${INTERNAL_CLASS}):not(.${EXTERNAL_CLASS})`;
    const anchors: NodeListOf<HTMLAnchorElement> = document.body.querySelectorAll(selector);
    for (const anchor of anchors) {
        const href: string = anchor.href;
        if (isExternalLink(href)) {
            anchor.classList.add(EXTERNAL_CLASS);
        } else {
            anchor.classList.add(INTERNAL_CLASS);
            const {wikiLink} = window.localWiki.parseURI(href);
            window.ipcApi.existsLink(wikiLink)
            .then(exists => {
                if (!exists) {
                    anchor.classList.add('new');
                }
            });
        }
    }
}

View.addUpdateAction(markAnchorTags);

function addDnamicEventLister(type: string, tagName: string, listener: (event: Event, element: HTMLElement) => boolean, options: boolean=false): void {
    const upperTageName: string = tagName.toUpperCase();
    document.body.addEventListener(type, (event: Event) => {
        let element: HTMLElement|null = event.target as HTMLElement;
        while (element && element !== document.body) {
            if (element.nodeName === upperTageName) {
                if (listener(event, element)) {
                    break;
                }
            }
            element = element.parentNode as HTMLElement;
        }
    }, options);
}

window.addEventListener('load', () => {
    const contentBody: HTMLElement = document.getElementById('content-body') as HTMLElement;
    addDnamicEventLister('click', 'A', (event: Event, element: HTMLElement) => {
        const anchor: HTMLAnchorElement = element as HTMLAnchorElement;
        if (isExternalLink(anchor.href)) {
            window.ipcApi.openExternalLink(anchor.href);
            event.preventDefault();
        }
        return true;
    });

    const contentHead: HTMLElement = document.getElementById('content-head') as HTMLElement;
    const params: Params = new Params();
    contentHead.innerText = params.path;
    initAccessArea(params);

    getMainContent(params)
    .then(({namespaceIcon, title, body, sideMenu, tabs, dependences}) => {
        const namespace: string = params.namespace;
        initMainIcon(namespaceIcon, namespace);
        initTabs(namespace, tabs);
        contentHead.innerHTML = title;
        contentBody.innerHTML = body;
        const sideMenuEl: HTMLElement = document.getElementById('wiki-side-menu') as HTMLElement;
        sideMenuEl.innerHTML = sideMenu;
        for (const css of dependences.css) {
            linkCSS(css);
        }
        for (const js of dependences.js) {
            importJS(js);
        }
    })
    .then(() => {
        View.update();
    })
    .catch(e => {
        contentHead.innerHTML = 'This page is not working...';
        contentBody.innerHTML = '';
        contentBody.prepend(createAlertMessage('We\'re sorry, but something went wrong.', 'danger'));
        console.log(e);
    });
});
