const DEFAULT_MODE: PageMode = 'read';
const DEFAULT_PATH: string = 'Main';


class Params {
    private params: URLSearchParams;
    public static readonly MODE_KEY: string = 'mode';
    public static readonly PATH_KEY: string = 'path';
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

    public get keys(): string[] {
        const keys: string[] = [Params.MODE_KEY, Params.PATH_KEY];
        for (const key of this.params.keys()) {
            if (keys.includes(key)) {
                continue;
            }
            keys.push(key);
        }
        return keys;
    }
}


function initTabs(tabs: TabParams[]) {
    const searchTag: HTMLLIElement = document.getElementById('search-tag') as HTMLLIElement;
    for (const tab of tabs) {
        const {title, href, selected} = tab;
        const li: HTMLLIElement = document.createElement('li');
        searchTag.before(li);
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
            let href: string = '?path=Special:Search&search=' + searchField.value;
            location.href = href;
        }
    });
}


function initAccessArea(params: Params) {
    const {path, mode} = params;
    const accessField: HTMLInputElement = document.getElementById('access-field') as HTMLInputElement;
    const accessParams: string = params.keys.filter(key => key !== Params.PATH_KEY)
                                            .filter(key => !(key === Params.MODE_KEY && mode === DEFAULT_MODE))
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
            let href: string = '?path=' + window.utils.trim(fieldValues[0]);
            if (fieldValues.length > 1) {
                href += '&' + window.utils.trim(fieldValues[1]);
            }
            location.href = href;
        }
    });

    const goBackButton: HTMLButtonElement = document.getElementById('go-back-button') as HTMLButtonElement;
    const goForwardButton: HTMLButtonElement = document.getElementById('go-forward-button') as HTMLButtonElement;
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

async function getMainContent(params: Params): Promise<{linkElement: WikiLinkElement,
                                                        title: string, body: string, tabs: TabParams[],
                                                        dependences: {css: string[], js: string[]}}> {
    const version: string = params.getValueOf('version');
    if (version.match(/^\d+$/)) {
        return window.ipcApi.getMainContent(params.mode, params.path, Number(version));
    } else {
        return window.ipcApi.getMainContent(params.mode, params.path);
    }
}

window.addEventListener('load', () => {
    const contentBody: HTMLElement = document.getElementById('content-body') as HTMLElement;
    contentBody.addEventListener('click', function(event) {
        let element: HTMLElement|null = event.target as HTMLElement;
        while (element && element !== contentBody) {
            if (element.nodeName === 'A') {
                const anchor: HTMLAnchorElement = element as HTMLAnchorElement;
                if (anchor.classList.contains('external')) {
                    window.ipcApi.openExternalLink(anchor.href);
                    event.preventDefault();
                }
                break;
            }
            element = element.parentNode as HTMLElement;
        }
    }, false);


    const contentHead: HTMLElement = document.getElementById('content-head') as HTMLElement;
    const params: Params = new Params();
    contentHead.innerText = params.path;
    initAccessArea(params);

    getMainContent(params)
    .then(({linkElement, title, body, tabs, dependences}) => {
        initTabs(tabs);
        contentHead.innerHTML = title;
        contentBody.innerHTML = body;
        for (const css of dependences.css) {
            linkCSS(css);
        }
        for (const js of dependences.js) {
            importJS(js);
        }
    })
    .catch(e => {
        contentHead.innerHTML = 'This page is not working...';
        const lines: string[] = [
            '<div class="alert alert-danger" role="alert">',
              'We\'re sorry, but something went wrong.',
            '</div>',
        ];
        contentBody.innerHTML = lines.join('');
        console.log(e);
    });
});
