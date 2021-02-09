/* import SimpleMDE from 'simplemde'; */

jQuery(() => {
    const mde = new SimpleMDE({
        element: $('#markdown-edit-form')[0],
        status: false,
        toolbar: false,
        renderingConfig: {
            singleLineBreaks: false,
            codeSyntaxHighlighting: true,
        },
        shortcuts: {
            'toggleBlockquote': null,
            'toggleBold': null,
            'cleanBlock': null,
            'toggleHeadingSmaller': null,
            'toggleItalic': null,
            'drawLink': null,
            'toggleUnorderedList': null,
            'togglePreview': null,
            'toggleCodeBlock': null,
            'drawImage': null,
            'toggleOrderedList': null,
            'toggleHeadingBigger': null,
            'toggleSideBySide': null,
            'toggleFullScreen': null,
        },
        spellChecker: false,
    });

    const $previewButton: JQuery = $('#preview-toggle-button');

    function init(text: string|null=''): void {
        if (typeof text === 'string') {
            mde.value(text);
        }

        // preview is initially inactive.
        if (mde.isPreviewActive()) {
            SimpleMDE.togglePreview(mde);
        }
        $previewButton.removeClass('btn-secondary').addClass('btn-outline-secondary');
    }

    function togglePreview(): void {
        SimpleMDE.togglePreview(mde);
        $previewButton.toggleClass('btn-secondary').toggleClass('btn-outline-secondary');
    }

    $previewButton.on('click', () => {
        togglePreview();
    });

    $('.CodeMirror').on('click', () => {
        if (mde.isPreviewActive()) {
            togglePreview();
        }
    });

    $('#done-button').on('click', () => {
        alert('保存');
    });


    init('[aaa](example.com)\n\n{{aaa, bbb}}\n\n[[aaa, bbb]]');
});
