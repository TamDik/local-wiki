const NO_FILE_CHOSEN: string = 'No file chosen';

const extensions: string[] = ['png', 'jpg', 'jpeg', 'gif', 'pdf'];
const permittedExtensions: HTMLSpanElement = document.getElementById('permitted-extensions') as HTMLSpanElement;
permittedExtensions.innerText = extensions.join(', ');

const chooseFileButton: HTMLButtonElement = document.getElementById('choose-file-button') as HTMLButtonElement;
const destInput: HTMLInputElement = document.getElementById('destination-filename') as HTMLInputElement;
const commentInput: HTMLInputElement = document.getElementById('upload-comment') as HTMLInputElement;
const uploadButton: HTMLButtonElement = document.getElementById('upload-button') as HTMLButtonElement;
const filepathLabel: HTMLLabelElement = document.getElementById('chosen-filepath') as HTMLLabelElement;
setNoFileChosen();
destInput.value = new Params().getValueOf('dest');

function extensionOf(filename: string): string {
    return filename.replace(/^.*\./, '');
}

function getChosenFilepath(): string|null {
    const filepath: string = filepathLabel.innerText;
    if (filepath === NO_FILE_CHOSEN) {
        return null;
    }
    return filepath;
}

function getDestName(): string|null {
    const name: string = trim(destInput.value);
    if (name === '') {
        return null;
    }
    return name;
}

function canUpload(): boolean {
    if (getChosenFilepath() === null) {
        return false;
    }
    const destName: string|null = getDestName();
    if (destName === null) {
        return false;
    }
    if (destName.includes(':')) {
        return false;
    }
    return true;
}

function setNoFileChosen(): void {
    filepathLabel.innerText = NO_FILE_CHOSEN;
    uploadButton.disabled = true;
}

function setChosenFilepath(filepath: string): void {
    filepathLabel.innerText = filepath;
    uploadButton.disabled = !canUpload();
}

chooseFileButton.onclick = () => {
    window.dialog.showOpenDialog({properties: ['openFile']})
    .then((result: {canceled: boolean, filePaths: string[]}) => {
        if (result.canceled || result.filePaths.length !== 1) {
            setNoFileChosen();
            return;
        }
        const filepath: string = result.filePaths[0];
        const extension: string = extensionOf(filepath);
        if (!extensions.includes(extension)) {
            setNoFileChosen();
            alert('Invalid file extension');
            return;
        }
        setChosenFilepath(filepath);
    });
};

destInput.onchange = () => {
    uploadButton.disabled = !canUpload();
    const destName: string|null = getDestName();
    if (typeof(destName) === 'string') {
        if (destName.includes(':')) {
            alert('You can\'t use ":".');
            destInput.focus();
        }
    }
}

uploadButton.onclick = () => {
    const filepath: string|null = getChosenFilepath();
    if (filepath == null) {
        return;
    }
    const params: Params = new Params();
    const name: string = trim(destInput.value);
    const comment: string = trim(commentInput.value);
    window.ipcRenderer.invoke<string>('upload-file', params.path, name, filepath, comment)
    .then(path => {
        location.href = `?${Params.PATH_KEY}=${path}`;
    })
    .catch(e => {
    });
};