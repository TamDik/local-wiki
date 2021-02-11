const DEFAULT_MODE: PageMode = 'read';
const DEFAULT_PATH: string = 'Main';


function trim(v: string): string {
    return v.replace(/^\s+|\s+$/g, '');
}

class Params {
    private params: URLSearchParams;
    public constructor() {
        const url: URL = new URL(location.href);
        this.params = url.searchParams;
    }

    public get mode(): PageMode {
        const key: string = 'mode';
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
        const key: string = 'path';
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
}


function initTags(params: Params) {
    const {path, mode} = params;
    const readTag: HTMLElement = document.getElementById('read-tag') as HTMLElement;
    const editTag: HTMLElement = document.getElementById('edit-tag') as HTMLElement;
    const histTag: HTMLElement = document.getElementById('history-tag') as HTMLElement;

    const readAnchor: HTMLAnchorElement = readTag.children[0] as HTMLAnchorElement;
    const editAnchor: HTMLAnchorElement = editTag.children[0] as HTMLAnchorElement;
    const histAnchor: HTMLAnchorElement = histTag.children[0] as HTMLAnchorElement;
    readAnchor.href = `?path=${path}&mode=read`;
    editAnchor.href = `?path=${path}&mode=edit`;
    histAnchor.href = `?path=${path}&mode=history`;

    readTag.className = '';
    editTag.className = '';
    histTag.className = '';
    if (mode === 'read') {
        readTag.className = 'selected';
    } else if (mode === 'edit') {
        editTag.className = 'selected';
    } else if (mode === 'history') {
        histTag.className = 'selected';
    }
}


function initAccessArea(params: Params) {
    const {path, mode} = params;
    const accessField: HTMLInputElement = document.getElementById('access-field') as HTMLInputElement;
    if (mode === DEFAULT_MODE) {
        accessField.value = path;
    } else {
        accessField.value = path + '?mode=' + mode;
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
    }
}

function importRequiredJS(mode: PageMode, linkElement: WikiLinkElement): void {
    if (linkElement.type === 'Page' && mode === 'edit') {
        importJS('./js/editor.js');
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
        console.log(e);
    });
}
