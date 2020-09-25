function updateMain($parent: JQuery, wikiNS: string, wikiType: WikiType, wikiName: string, wikiAction: WikiAction): void {
    window.ipcRenderer.invoke<string | null>('get-content', wikiNS, wikiType, wikiName)
    .then(text => {
        if (text === null) {
            return;
        }
        const main: HTMLElement = wikimdToElement(text, 3);
        $parent.append(main);
    });
}
