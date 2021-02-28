(() => {
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
        const wikiLink = window.localWiki.parsePath(path);
        if (wikiLink.type !== 'Page') {
            return false;
        }
        return window.ipcApi.existsLink(wikiLink);
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
        const version: number = await window.ipcApi.currentVersion(path);

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

        const newPathInput: HTMLInputElement = getPathInput('new');
        const oldPathInput: HTMLInputElement = getPathInput('old');
        if (newPathInput.value !== oldPathInput.value) {
            input.value = input.max;
            return;
        }

        let theOtherInput: HTMLInputElement;
        switch (pageType) {
            case 'new':
                theOtherInput = getVersionInput('old');
            break;
            case 'old':
                theOtherInput = getVersionInput('new');
            break;
        }
        if (theOtherInput.value !== theOtherInput.max) {
            input.value = input.max;
            return;
        }
        input.value = input.max === input.min ? input.max : String(Number(input.max) - 1);
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

    function versionInputEvent(pageType: PageType): () => void {
        return () => {
            const input: HTMLInputElement = getVersionInput(pageType);
            const numValue: number = Number(input.value);
            const numMax: number = Number(input.max);
            const numMin: number = Number(input.min);
            if (numValue > numMax) {
                input.value = input.max;
            } else if (numValue < numMin) {
                input.value = input.min;
            }
        };
    }


    function diffShow(): void {
        const newPath: string = getPathInput('new').value;
        const newVersion: number = Number(getVersionInput('new').value);
        const oldPath: string = getPathInput('old').value;
        const oldVersion: number = Number(getVersionInput('old').value);
        const p1: Promise<string> = window.ipcApi.getRawPageText(newPath, newVersion);
        const p2: Promise<string> = window.ipcApi.getRawPageText(oldPath, oldVersion);
        Promise.all([p1, p2])
        .then(([text1, text2]) => {
            const wrapper: HTMLDivElement = document.getElementById('differences-wrapper') as HTMLDivElement;
            const table: DiffCodeTable = new DiffCodeTable(wrapper);
            table.setAfterCode(text1);
            table.setBeforeCode(text2);
            table.update();
        });
    }

    newPath.addEventListener('input', pathInputEvent('new'), false);
    oldPath.addEventListener('input', pathInputEvent('old'), false);
    newVersion.addEventListener('change', versionInputEvent('new'), false);
    oldVersion.addEventListener('change', versionInputEvent('old'), false);
    showButton.addEventListener('click', diffShow, false);

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
