const mdTextArea: HTMLTextAreaElement = document.getElementById('markdown-edit-area') as HTMLTextAreaElement;
const commentArea: HTMLInputElement = document.getElementById('comment-edit-area') as HTMLInputElement;


const params: Params = new Params();
let beforeChangedMD: string = '';
window.ipcRenderer.invoke<string>('get-raw-page-text', params.path)
.then(text => {
    mdTextArea.value = text;
    beforeChangedMD = text;
});


const saveButton: HTMLButtonElement = document.getElementById('page-edit-save-button') as HTMLButtonElement;
saveButton.onclick = () => {
    const text: string = mdTextArea.value;
    const comment: string = commentArea.value;
    window.ipcRenderer.invoke<boolean>('update-page', params.path, text, comment)
    .then(result => {
        location.href = `?${Params.PATH_KEY}=${params.path}`;
    })
    .catch(e => {
    });
};


const previewButton: HTMLButtonElement = document.getElementById('page-edit-preview-button') as HTMLButtonElement;
const previewAlert: HTMLDivElement = document.getElementById('preview-alert') as HTMLDivElement;
const previewWrapper: HTMLElement = document.getElementById('preview-wrapper') as HTMLElement;
previewButton.onclick = () => {
    const markdown: string = mdTextArea.value;
    previewAlert.classList.remove('d-none');
    window.ipcRenderer.invoke<string>('markdown-to-html', markdown)
    .then(html => {
        previewWrapper.innerHTML = html;
    });
};


const resetButton: HTMLButtonElement = document.getElementById('page-edit-reset-button') as HTMLButtonElement;
resetButton.onclick = () => {
    previewAlert.classList.add('d-none');
    previewWrapper.innerHTML = '';
    mdTextArea.value = beforeChangedMD;
};


// SimpleMDE の適用（切り替えも）


/* const mde = new SimpleMDE({ */
/*     element: $('#markdown-edit-form')[0], */
/*     status: false, */
/*     toolbar: false, */
/*     renderingConfig: { */
/*         singleLineBreaks: false, */
/*         codeSyntaxHighlighting: true, */
/*     }, */
/*     shortcuts: { */
/*         'toggleBlockquote': null, */
/*         'toggleBold': null, */
/*         'cleanBlock': null, */
/*         'toggleHeadingSmaller': null, */
/*         'toggleItalic': null, */
/*         'drawLink': null, */
/*         'toggleUnorderedList': null, */
/*         'togglePreview': null, */
/*         'toggleCodeBlock': null, */
/*         'drawImage': null, */
/*         'toggleOrderedList': null, */
/*         'toggleHeadingBigger': null, */
/*         'toggleSideBySide': null, */
/*         'toggleFullScreen': null, */
/*     }, */
/*     spellChecker: false, */
/* }); */


/* function init(text: string|null=''): void { */
/*     if (typeof text === 'string') { */
/*         mde.value(text); */
/*     } */
/* } */

/* init('[aaa](example.com)\n\n{{aaa, bbb}}\n\n[[aaa, bbb]]'); */
