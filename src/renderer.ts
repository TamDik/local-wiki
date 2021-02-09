class Params {
    private params: URLSearchParams;
    public constructor() {
        const url: URL = new URL(location.href);
        this.params = url.searchParams;
    }

    public get mode(): pageMode {
        const key: string = 'mode';
        const value: string|null = this.params.get(key);
        if (window.localWiki.isMode(value)) {
            return value;
        }
        return 'read';
    }

    public get path(): string {
        const key: string = 'path';
        const value: string|null = this.params.get(key);
        if (value === null) {
            return 'Main';
        }
        return value;
    }
}


function setTags(mode: pageMode) {
    const readTag: HTMLElement = document.getElementById('read-tag') as HTMLElement;
    const editTag: HTMLElement = document.getElementById('edit-tag') as HTMLElement;
    const historyTag: HTMLElement = document.getElementById('history-tag') as HTMLElement;
    readTag.className = '';
    editTag.className = '';
    historyTag.className = '';
    if (mode === 'read') {
        readTag.className = 'selected';
    } else if (mode === 'edit') {
        editTag.className = 'selected';
    } else if (mode === 'history') {
        historyTag.className = 'selected';
    }
}


onload = () => {
    const body: HTMLElement = document.getElementById('content-body') as HTMLElement;
    const heading: HTMLElement = document.getElementById('content-heading') as HTMLElement;
    const params: Params = new Params();
    heading.innerText = params.path;

    window.ipcRenderer.invoke<{title: string, html: string}>('get-content-body', params.mode, params.path)
    .then(({title, html}) => {
        heading.innerHTML = title;
        body.innerHTML = html;
    })
    .catch(e => {
        console.log(e);
    });

    setTags(params.mode);
}
