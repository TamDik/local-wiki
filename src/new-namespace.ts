(() => {
    type NamespaceType = 'internal'|'external';
    const NO_DIRECTORY_CHOSEN: string = 'No direcotry chosen';
    const iconCanvas: HTMLCanvasElement = document.getElementById('namespace-icon-canvas') as HTMLCanvasElement;
    const nameInput: HTMLInputElement = document.getElementById('new-namespace-name') as HTMLInputElement;
    const nameAlert: HTMLDivElement = document.getElementById('namespace-name-alert') as HTMLDivElement;
    const typeSelect: HTMLSelectElement = document.getElementById('new-namespace-type') as HTMLSelectElement;
    const directoryButton: HTMLButtonElement = document.getElementById('external-namespace-directory-button') as HTMLButtonElement;
    const directoryLabel: HTMLLabelElement = document.getElementById('external-namespace-directory') as HTMLLabelElement;
    const createButton: HTMLButtonElement = document.getElementById('create-namespace-button') as HTMLButtonElement;

    async function setCreateButton(): Promise<void> {
        createButton.disabled = !await canCreateNamespace();
    }

    function setDirectoryButton(): void {
        if (typeSelect.value === 'external') {
            directoryButton.disabled = false;
            directoryLabel.style.backgroundColor = '#fff';
        } else {
            directoryButton.disabled = true;
            directoryLabel.style.backgroundColor = '#e9ecef';
        }
    }

    async function canCreateNamespace(): Promise<boolean> {
        const namespace: string = window.utils.trim(nameInput.value);
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
        return window.ipcApi.existsNamespace(window.utils.trim(namespace));
    }

    nameInput.addEventListener('input', () => {
        setCreateButton();
        window.ipcApi.existsNamespace(nameInput.value)
        .then(exists => {
            if (exists) {
                nameAlert.classList.remove('d-none');
            } else {
                nameAlert.classList.add('d-none');
            }
        });
    }, false);

    typeSelect.addEventListener('change', () => {
        setDirectoryButton();
        setCreateButton();
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
            return window.ipcApi.usedAsAnExternalNamespace(directory)
        })
        .then(used => {
            // TODO: 選択されたディレクトリが既に名前空間として使用されている場合
            if (used) {
                nameInput.value = 'in used';
            }
            setCreateButton();
        });
    });

    createButton.addEventListener('click', () => {
        const base64: string = iconCanvas.toDataURL('image/png').replace('data:image/png;base64,', '').replace(' ', '+');
        const namespace: string = nameInput.value;
        const type: NamespaceType = typeSelect.value as NamespaceType;
        const directory: string = directoryLabel.innerText;
        const href: string = window.localWiki.toURI({namespace});
        if (type === 'internal') {
            window.ipcApi.createInternalNamespace(namespace, base64);
            location.href = href;
            return;
        }

        if (type === 'external') {
            window.ipcApi.usedAsAnExternalNamespace(directory)
            .then(used => {
                if (used) {
                    window.ipcApi.revertExternalNamespace(directory);
                } else {
                    window.ipcApi.createExternalNamespace(namespace, base64, directory);
                }
                location.href = href;
            });
        }
    });

    function getCanvasSize(): {width: number, height: number} {
        return {width: iconCanvas.width, height: iconCanvas.height};
    }

    iconCanvas.addEventListener('click', () => {
        const context: CanvasRenderingContext2D = iconCanvas.getContext('2d') as CanvasRenderingContext2D;
        const canvasSize: {width: number, height: number} = getCanvasSize();
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
            const image: HTMLImageElement = new Image();
            image.src = iconpath;
            image.addEventListener('load', () => {
                const sSize = Math.min(image.width, image.height);
                const sx = (image.width - sSize) / 2;
                const sy = (image.height - sSize) / 2;
                context.drawImage(image, sx, sy, sSize, sSize, 0, 0, canvasSize.width, canvasSize.height);
            });
        })
    });

    function setDefaultIcon(): void {
        const context: CanvasRenderingContext2D = iconCanvas.getContext('2d') as CanvasRenderingContext2D;
        const canvasSize: {width: number, height: number} = getCanvasSize();
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

    const params: Params = new Params();
    const newName: string = params.getValueOf('new');
    nameInput.value = newName;
    directoryLabel.innerText = NO_DIRECTORY_CHOSEN;
    setCreateButton();
    setDirectoryButton();

    iconCanvas.width = 200;
    iconCanvas.height = 200;
    setDefaultIcon();
})();
