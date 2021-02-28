(() => {
    const iconCanvas: HTMLCanvasElement = document.getElementById('namespace-icon-canvas') as HTMLCanvasElement;
    const context: CanvasRenderingContext2D = iconCanvas.getContext('2d') as CanvasRenderingContext2D;
    iconCanvas.width = 200;
    iconCanvas.height = 200;
    const canvasSize: {width: number, height: number} = {width: iconCanvas.width, height: iconCanvas.height};
    const iconWarning: HTMLDivElement = document.getElementById('namespace-icon-warning') as HTMLDivElement;

    const nameInput: HTMLInputElement = document.getElementById('new-namespace-name') as HTMLInputElement;
    const nameAlert: HTMLDivElement = document.getElementById('namespace-name-alert') as HTMLDivElement;
    const nameWarning: HTMLDivElement = document.getElementById('namespace-name-warning') as HTMLDivElement;

    const typeSelect: HTMLSelectElement = document.getElementById('new-namespace-type') as HTMLSelectElement;

    const directoryButton: HTMLButtonElement = document.getElementById('external-namespace-directory-button') as HTMLButtonElement;
    const directoryLabel: HTMLLabelElement = document.getElementById('external-namespace-directory') as HTMLLabelElement;
    const NO_DIRECTORY_CHOSEN: string = 'No directory chosen';

    const createButton: HTMLButtonElement = document.getElementById('create-namespace-button') as HTMLButtonElement;


    for (const dismissibleAlert of [iconWarning, nameWarning]) {
        const buttons: NodeListOf<HTMLElement> = dismissibleAlert.querySelectorAll('.close');
        for (const button of buttons) {
            button.addEventListener('click', () => {
                hideAlert(dismissibleAlert);
            });
        }
    }

    function getNameValue(): string {
        return window.utils.trim(nameInput.value);
    }

    let selectedDirectoryStatus: 'USED'|'NOT_USED' = 'NOT_USED';
    function selectedUsedDirectory(): boolean {
        return selectedDirectoryStatus === 'USED';
    }

    async function canCreateNamespace(): Promise<boolean> {
        const namespace: string = getNameValue();
        if (namespace === '') {
            return false;
        }
        if (await existsNamespace(namespace)) {
            return false;
        }
        if (typeSelect.value === 'external' && directoryLabel.innerText === NO_DIRECTORY_CHOSEN) {
            return false;
        }
        return true;
    }

    async function existsNamespace(namespace: string): Promise<boolean> {
        return window.ipcApi.existsNamespace(namespace);
    }

    function showAlert(element: HTMLDivElement): void {
        element.classList.remove('d-none');
    }

    function hideAlert(element: HTMLDivElement): void {
        element.classList.add('d-none');
    }

    function setDefaultIcon(): void {
        const cellSize = {x: 5, y: 5};
        const hsl = {
            h: Math.random() * 360,
            s: 65 - Math.random() * 20,
            l: 75 - Math.random() * 20
        };
        function fillCell(x: number, y: number) {
            const width: number = canvasSize.width / cellSize.x;
            const height: number = canvasSize.height / cellSize.y;
            const x1: number = x * width;
            const y1: number = y * height;
            context.fillRect(x1, y1, width, height);
        }
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvasSize.width, canvasSize.height);
        context.fillStyle = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        for (let x = 0; x < cellSize.x / 2; x++) {
            for (let y = 0; y < cellSize.y; y++) {
                if (Math.random() < 0.5) {
                    fillCell(x, y);
                    fillCell(cellSize.x - x - 1, y);
                }
            }
        }
        context.strokeStyle = '#000';
        context.strokeRect(0, 0, iconCanvas.width, iconCanvas.height);
    }

    function setIconWithImage(src: string): void {
        const image: HTMLImageElement = new Image();
        image.src = src;
        image.addEventListener('load', () => {
            const sSize = Math.min(image.width, image.height);
            const sx = (image.width - sSize) / 2;
            const sy = (image.height - sSize) / 2;
            context.drawImage(image, sx, sy, sSize, sSize, 0, 0, canvasSize.width, canvasSize.height);
        });
    }

    function setPreferencesWikilink(namespace: string): void {
        const spans: HTMLCollectionOf<HTMLElement> = document.getElementsByClassName('namespace-preferences-wikilink') as HTMLCollectionOf<HTMLElement>;
        for (const span of spans) {
            span.innerText = window.localWiki.toPath({namespace, type: 'Special', name: 'NamespacePreferences'});
        }
    }

    function updateUI(): void {
        // 内部か外部か
        if (typeSelect.value === 'external') {
            directoryButton.disabled = false;
            directoryLabel.style.backgroundColor = '#fff';
        } else {
            directoryLabel.innerText = NO_DIRECTORY_CHOSEN;
            directoryButton.disabled = true;
            directoryLabel.style.backgroundColor = '#e9ecef';
        }

        // 既に名前空間として利用されているディレクトリ
        new Promise<null|{name: string, iconPath: string}>((resolved, reject) => {
            const directory: string = directoryLabel.innerText;
            if (typeSelect.value === 'internal' || directory === NO_DIRECTORY_CHOSEN) {
                resolved(null);
            } else {
                resolved(window.ipcApi.usedAsAnExternalNamespace(directory));
            }
        })
        .then((data) => {
            if (data) {
                nameInput.value = data.name;
                nameInput.disabled = true;
                selectedDirectoryStatus = 'USED';
                setIconWithImage(data.iconPath);
                setPreferencesWikilink(data.name);
            } else {
                nameInput.disabled = false;
                selectedDirectoryStatus = 'NOT_USED';
            }

            // 既存の名前空間名との重複
            return existsNamespace(getNameValue());
        })
        .then(exists => {
            if (exists) {
                showAlert(nameAlert);
            } else {
                hideAlert(nameAlert);
            }

            // 作成可能
            return canCreateNamespace()
        })
        .then(can => {
            createButton.disabled = !can;
        });
    }

    (nameInput.parentElement as HTMLElement).addEventListener('click', () => {
        if (selectedUsedDirectory()) {
            showAlert(nameWarning);
        }
    }, false);

    nameInput.addEventListener('input', () => {
        updateUI();
    }, false);

    typeSelect.addEventListener('change', () => {
        updateUI();
    }, false);

    directoryButton.addEventListener('click', () => {
        window.dialog.openDirectoryDialog()
        .then(({canceled, filePaths}) => {
            if (canceled || filePaths.length !== 1) {
                return NO_DIRECTORY_CHOSEN;
            }
            return filePaths[0];
        })
        .then((directory: string) => {
            directoryLabel.innerText = directory;
            if (selectedUsedDirectory()) {
                setDefaultIcon();
            }
            updateUI();
        });
    });

    async function createNamespace(namespace: string): Promise<boolean> {
        const base64: string = iconCanvas.toDataURL('image/png').replace('data:image/png;base64,', '').replace(' ', '+');
        const type: string = typeSelect.value;
        const directory: string = directoryLabel.innerText;
        if (type === 'internal') {
            return window.ipcApi.createInternalNamespace(namespace, base64);
        }

        return window.ipcApi.usedAsAnExternalNamespace(directory)
        .then(used => {
            if (used) {
                return window.ipcApi.revertExternalNamespace(directory);
            } else {
                return window.ipcApi.createExternalNamespace(namespace, base64, directory);
            }
        });
    }

    createButton.addEventListener('click', () => {
        const namespace: string = getNameValue();
        createNamespace(namespace)
        .then(result => {
            const href: string = window.localWiki.toURI({namespace});
            location.href = href;
        });
    });

    iconCanvas.addEventListener('click', () => {
        if (selectedUsedDirectory()) {
            showAlert(iconWarning);
            return;
        }
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvasSize.width, canvasSize.height);

        window.dialog.openFileDialog()
        .then(({canceled, filePaths}) => {
            if (canceled || filePaths.length !== 1) {
                setDefaultIcon();
                return;
            }
            const iconpath: string = filePaths[0];
            const extension: string = window.utils.extensionOf(iconpath).toLowerCase();
            if (!['png', 'jpg', 'jpeg'].includes(extension)) {
                alert('Invalid file extension');
                setDefaultIcon();
                return;
            }
            setIconWithImage(iconpath);
        })
    });

    nameInput.value = new Params().getValueOf('new');
    directoryLabel.innerText = NO_DIRECTORY_CHOSEN;
    updateUI();

    setDefaultIcon();
})();
