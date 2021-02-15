const DEFAULT_MODE: PageMode = 'read';
const DEFAULT_PATH: string = 'Main';


function trim(v: string): string {
    return v.replace(/^\s+|\s+$/g, '');
}

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
        value = trim(value);
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
        value = trim(value);
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
        return trim(value);
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


function initTags(params: Params) {
    const {path, mode} = params;
    const readTag: HTMLElement = document.getElementById('read-tag') as HTMLElement;
    const editTag: HTMLElement = document.getElementById('edit-tag') as HTMLElement;
    const histTag: HTMLElement = document.getElementById('history-tag') as HTMLElement;

    const readAnchor: HTMLAnchorElement = readTag.children[0] as HTMLAnchorElement;
    const editAnchor: HTMLAnchorElement = editTag.children[0] as HTMLAnchorElement;
    const histAnchor: HTMLAnchorElement = histTag.children[0] as HTMLAnchorElement;
    readAnchor.href = `?${Params.PATH_KEY}=${path}&${Params.MODE_KEY}=read`;
    editAnchor.href = `?${Params.PATH_KEY}=${path}&${Params.MODE_KEY}=edit`;
    histAnchor.href = `?${Params.PATH_KEY}=${path}&${Params.MODE_KEY}=history`;

    readTag.classList.remove('selected');
    editTag.classList.remove('selected');
    histTag.classList.remove('selected');
    if (mode === 'read') {
        readTag.classList.add('selected');
    } else if (mode === 'edit') {
        editTag.classList.add('selected');
    } else if (mode === 'history') {
        histTag.classList.add('selected');
    }
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

    accessField.addEventListener('keyup', (event: KeyboardEvent) => {
        if (event.which == 13) {
            event.preventDefault();
            const fieldValues: string[] = accessField.value.split('?');
            let href: string = '?path=' + trim(fieldValues[0]);
            if (fieldValues.length > 1) {
                href += '&' + trim(fieldValues[1]);
            }
            location.href = href;
        }
    });

    const goBackButton: HTMLButtonElement = document.getElementById('go-back-button') as HTMLButtonElement;
    const goForwardButton: HTMLButtonElement = document.getElementById('go-forward-button') as HTMLButtonElement;
    window.ipcRenderer.invoke<{back: boolean, forward: boolean}>('can-go-back-or-forward')
    .then(({back, forward}) => {
        goBackButton.disabled = !back;
        goForwardButton.disabled = !forward;
    });

    goBackButton.onclick = () => {
        window.ipcRenderer.send('go-back');
    };

    goForwardButton.onclick = () => {
        window.ipcRenderer.send('go-forward');
    };
}


const headTag: HTMLHeadElement = document.getElementsByTagName('head')[0];

function linkCSS(href: string): void {
    const linkTag: HTMLLinkElement = document.createElement('link');
    linkTag.rel = 'stylesheet';
    linkTag.type = 'text/css';
    linkTag.href = href;
    headTag.appendChild(linkTag);
}

function importJS(src: string): void {
    const scriptTag: HTMLScriptElement = document.createElement('script');
    scriptTag.src = src;
    headTag.appendChild(scriptTag);
}

function linkRequiredCSS(mode: PageMode, linkElement: WikiLinkElement): void {
    if (linkElement.type === 'Page' && mode === 'edit') {
        linkCSS('./css/editor.css');
        return;
    }

    if (linkElement.type === 'Page' && mode === 'history') {
        linkCSS('./css/page-history.css');
        return;
    }

    if (linkElement.type === 'Special' && linkElement.name === 'PageDiff') {
        linkCSS('./css/page-diff.css');
        return;
    }
}

function importRequiredJS(mode: PageMode, linkElement: WikiLinkElement): void {
    if (linkElement.type === 'Page' && mode === 'edit') {
        importJS('./js/editor.js');
        return;
    }

    if (linkElement.type === 'Page' && mode === 'history') {
        importJS('./js/page-history.js');
        return;
    }

    if (linkElement.type === 'Special' && linkElement.name === 'UploadFile') {
        importJS('./js/upload-file.js');
        return;
    }

    if (linkElement.type === 'Special' && linkElement.name === 'PageDiff') {
        importJS('../node_modules/jsdifflib/index.js');
        importJS('./js/code-table.js');
        importJS('./js/page-diff.js');
        return;
    }
}

onload = () => {
    const contentBody: HTMLElement = document.getElementById('content-body') as HTMLElement;
    const contentHead: HTMLElement = document.getElementById('content-head') as HTMLElement;
    const params: Params = new Params();
    contentHead.innerText = params.path;
    initTags(params);
    initAccessArea(params);

    window.ipcRenderer.invoke<{linkElement: WikiLinkElement, title: string, body: string}>('get-main-content', params.mode, params.path)
    .then(({linkElement, title, body}) => {
        contentHead.innerHTML = title;
        contentBody.innerHTML = body;
        linkRequiredCSS(params.mode, linkElement);
        importRequiredJS(params.mode, linkElement);
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
}
