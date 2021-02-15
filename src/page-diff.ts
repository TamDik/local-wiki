const showButton: HTMLButtonElement = document.getElementById('show-differences-button') as HTMLButtonElement;
const newPath: HTMLInputElement = document.getElementById('new-page-path') as HTMLInputElement;
const newVersion: HTMLInputElement = document.getElementById('new-page-version') as HTMLInputElement;
const oldPath: HTMLInputElement = document.getElementById('old-page-path') as HTMLInputElement;
const oldVersion: HTMLInputElement = document.getElementById('old-page-version') as HTMLInputElement;

type PageType = 'new'|'old';

function getPathInput(pageType: PageType): HTMLInputElement {
    switch (pageType) {
        case 'new':
            return newPath;
        case 'old':
            return oldPath;
    }
}

function getVersionInput(pageType: PageType): HTMLInputElement {
    switch (pageType) {
        case 'new':
            return newVersion;
        case 'old':
            return oldVersion;
    }
}

async function existsPath(path: string): Promise<boolean> {
    if (path === '') {
        return false;
    }
    const exists: boolean = await window.ipcRenderer.invoke<boolean>('exists-path', path);
    return exists;
}

function areInputsFilled(): boolean {
    const pageTypes: PageType[] = ['new', 'old'];
    for (const pageType of pageTypes) {
        const pathInput: HTMLInputElement = getPathInput(pageType);
        const versionInput: HTMLInputElement = getVersionInput(pageType);
        if (pathInput.value === '') {
            return false;
        }
        if (versionInput.type !== 'number') {
            return false;
        }
    }
    return true;
}

function setShowButton(): void {
    showButton.disabled = !areInputsFilled();
}

function disableVersion(pageType: PageType): void {
    const input: HTMLInputElement = getVersionInput(pageType);
    if (input.disabled) {
        return;
    }
    input.disabled = true;
    input.type = 'text';
    input.value = 'the path is invalid';
}

async function enableVersion(pageType: PageType, path: string): Promise<void> {
    const input: HTMLInputElement = getVersionInput(pageType);
    if (!input.disabled) {
        return;
    }
    input.disabled = false;
    input.min = '1';
    input.value = '1';
    input.type = 'number';
    const version: number = await window.ipcRenderer.invoke<number>('current-version', path);
    input.max = String(version);
    input.value = input.max;
}

function setVersionValue(pageType: PageType, value?: number): void {
    const input: HTMLInputElement = getVersionInput(pageType);
    if (input.type !== 'number') {
        return;
    }
    if (typeof(value) === 'number') {
        input.value = String(value);
        return;
    }
    switch (pageType) {
        case 'new':
            input.value = input.max;
        case 'old':
            input.value = String(Number(input.max) - 1);
    }
}

function setPathValue(pageType: PageType, value: string): void {
    const input: HTMLInputElement = getPathInput(pageType);
    input.value = value;
}

function checkVersionValue(value: string, pageType: PageType): boolean {
    const input: HTMLInputElement = getVersionInput(pageType);
    if (input.type !== 'number') {
        return false;
    }
    const PATTERN: RegExp = /^\d+$/;
    if (!value.match(PATTERN)) {
        return false;
    }
    const n: number = Number(value);
    if (n > Number(input.max)) {
        return false;
    }
    if (n < Number(input.min)) {
        return false;
    }
    return true;
}

async function initVersion(pageType: PageType, path: string, params: Params): Promise<void> {
    const key: string = pageType === 'new' ? 'diff' : 'old';
    const value: string = params.getValueOf(key);
    if (checkVersionValue(value, pageType)) {
        await enableVersion(pageType, path);
        setVersionValue(pageType, Number(value));
    } else {
        await enableVersion(pageType, path);
    }
}

function pathInputEvent(pageType: PageType): () => void {
    return () => {
        const input: HTMLInputElement = getPathInput(pageType);
        const path: string = input.value;
        existsPath(path)
        .then(exists => {
            if (!exists) {
                disableVersion(pageType);
                return;
            }
            return enableVersion(pageType, path)
            .then(() => {
                setVersionValue(pageType);
            });
        })
        .then(() => {
            setShowButton();
        });
    };
}

function versionInputEvent(pageType: PageType): void {
    const input: HTMLInputElement = getVersionInput(pageType);
    const numValue: number = Number(input.value);
    const maxValue: number = Number(input.max);
    const minValue: number = Number(input.min);
    if (numValue > maxValue) {
        input.value = input.max;
    } else if (numValue < minValue) {
        input.value = input.min;
    }
}


function diffShow(): void {
    const newPath: string = getPathInput('new').value;
    const newVersion: number = Number(getVersionInput('new').value);
    const oldPath: string = getPathInput('old').value;
    const oldVersion: number = Number(getVersionInput('old').value);
    const p1: Promise<string> = window.ipcRenderer.invoke<string>('get-raw-page-text', newPath, newVersion);
    const p2: Promise<string> = window.ipcRenderer.invoke<string>('get-raw-page-text', oldPath, oldVersion);
    Promise.all([p1, p2])
    .then(([text1, text2]) => {
        const wrapper: HTMLDivElement = document.getElementById('differences-wrapper') as HTMLDivElement;
        const table: DiffCodeTable = new DiffCodeTable(wrapper);
        table.setBeforeCode(text1);
        table.setAfterCode(text2);
        table.update();
    });
}

newPath.oninput = pathInputEvent('new');
oldPath.oninput = pathInputEvent('old');
newVersion.onchange = () => versionInputEvent('new');
oldVersion.onchange = () => versionInputEvent('old');
showButton.onclick = diffShow;

(() => {
    disableVersion('new');
    disableVersion('old');
    const params: Params = new Params();
    const path: string = params.getValueOf('page');
    setPathValue('old', path);
    setPathValue('new', path);
    existsPath(path)
    .then(exists => {
        if (!exists) {
            return;
        }
        const p11: Promise<void> = enableVersion('old', path);
        const p12: Promise<void> = enableVersion('new', path);
        return Promise.all([p11, p12])
        .then(() => {
            const p21: Promise<void> = initVersion('old', path, params);
            const p22: Promise<void> = initVersion('new', path, params);
            return Promise.all([p21, p12]);
        })
        .then(() => {
            diffShow();
        });
    })
    .then(() => {
        setShowButton();
    });
})();
