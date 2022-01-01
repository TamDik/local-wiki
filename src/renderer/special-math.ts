(() => {
    const editor: HTMLTextAreaElement = document.getElementById('editor') as HTMLTextAreaElement;
    const preview: HTMLDivElement = document.getElementById('preview') as HTMLDivElement;
    editor.addEventListener('input', async (event: any) => {
        const tex: string = editor.value.trim();
        if (tex === '') {
            preview.classList.add('d-none');
            return;
        }
        window.ipcApi.tex2svg(tex)
        .then(result => {
            preview.classList.remove('d-none');
            const span: HTMLElement = document.createElement('span');
            if (result.success) {
                preview.innerHTML = result.output;
            } else {
                preview.innerHTML = tex + `<span class="text-danger"> (Error: ${result.message}) </span>`
            }
        });
    });
})();
