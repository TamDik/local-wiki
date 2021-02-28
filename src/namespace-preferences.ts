(() => {
    const nameAlert: HTMLDivElement = document.getElementById('namespace-name-alert') as HTMLDivElement;
    const nameInput: HTMLInputElement = document.getElementById('new-namespace-name') as HTMLInputElement;

    const iconImg: HTMLImageElement = document.getElementById('namespace-icon-image') as HTMLImageElement;
    const iconCanvas: HTMLCanvasElement = document.getElementById('namespace-icon-canvas') as HTMLCanvasElement;
    const context: CanvasRenderingContext2D = iconCanvas.getContext('2d') as CanvasRenderingContext2D;
    const canvasSize = {width: iconCanvas.width, height: iconCanvas.height};

    const namespaceId: string = (document.getElementById('namespace-id') as HTMLInputElement).value;

    const saveButton: HTMLButtonElement = document.getElementById('save-namespace-button') as HTMLButtonElement;

    function getNameValue(): string {
        return window.utils.trim(nameInput.value);
    }

    const nameBeforeChange: string = getNameValue();

    async function existsNamespace(namespace: string): Promise<boolean> {
        return window.ipcApi.existsNamespace(namespace);
    }

    async function canSaveNamespace(): Promise<boolean> {
        const namespace: string = getNameValue();
        if (namespace === '') {
            return false;
        }
        if (namespace === nameBeforeChange) {
            return true;
        }
        if (await existsNamespace(namespace)) {
            return false;
        }
        return true;
    }

    async function setSaveButton(): Promise<void> {
        saveButton.disabled = !await canSaveNamespace();
    }

    iconImg.addEventListener('load', () => {
        context.drawImage(iconImg, 0, 0, iconImg.width, iconImg.height, 0, 0, iconCanvas.width, iconCanvas.height);
    }, false);

    iconCanvas.addEventListener('click', () => {
        window.dialog.openFileDialog()
        .then(({canceled, filePaths}) => {
            if (canceled || filePaths.length !== 1) {
                return;
            }
            const iconpath: string = filePaths[0];
            const extension: string = window.utils.extensionOf(iconpath).toLowerCase();
            if (!['png', 'jpg', 'jpeg'].includes(extension)) {
                alert('Invalid file extension');
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
        });
    }, false);

    nameInput.addEventListener('input', () => {
        const namespace: string = getNameValue();
        if (namespace === nameBeforeChange) {
            nameAlert.classList.add('d-none');
            setSaveButton();
            return;
        }

        existsNamespace(namespace)
        .then(exists => {
            if (exists) {
                nameAlert.classList.remove('d-none');
            } else {
                nameAlert.classList.add('d-none');
            }
        })
        .then(() => {
            setSaveButton();
        });
    }, false);

    saveButton.addEventListener('click', () => {
        const base64: string = iconCanvas.toDataURL('image/png').replace('data:image/png;base64,', '').replace(' ', '+');
        const namespace: string = getNameValue();
        window.ipcApi.updateNamespace(namespaceId, namespace, base64)
        .then(result => {
            location.href = window.localWiki.toURI({namespace});
        });
    });

    setSaveButton();
})();
