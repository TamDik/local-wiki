type WikiAction = 'view' | 'edit' | 'history' | 'revert' | 'raw'; /* 'delete' */

// ユーザーの操作

jQuery(() => {
    const $document: JQuery<Document> = $(document);
    const $mainContentWrapper: JQuery = $('#main-content-wrapper');

    $document.on('click', 'a', event => {
        event.preventDefault();
    });

    $document.on('click', '.external-link', event => {
    });

    $document.on('click', '.internal-link', event => {
    });
});
