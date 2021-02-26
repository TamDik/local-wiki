type NamespaceType = 'internal'|'external';
const NO_DIRECTORY_CHOSEN: string = 'No direcotry chosen';
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
    const namespace: string = nameInput.value;
    const type: NamespaceType = typeSelect.value as NamespaceType;
    const directory: string = directoryLabel.innerText;
    const href: string = window.localWiki.toURI({namespace});
    if (type === 'internal') {
        window.ipcApi.createInternalNamespace(namespace);
        location.href = href;
        return;
    }

    if (type === 'external') {
        window.ipcApi.usedAsAnExternalNamespace(directory)
        .then(used => {
            if (used) {
                window.ipcApi.revertExternalNamespace(directory);
            } else {
                window.ipcApi.createExternalNamespace(namespace, directory);
            }
            location.href = href;
        });
    }
});


(() => {
    const params: Params = new Params();
    const newName: string = params.getValueOf('new');
    nameInput.value = newName;
    directoryLabel.innerText = NO_DIRECTORY_CHOSEN;
    setCreateButton();
    setDirectoryButton();
})();
