(() => {
    const searchButton: HTMLInputElement = document.getElementById('search-page-button') as HTMLInputElement;
    const searchField: HTMLInputElement = document.getElementById('search-keyword-field') as HTMLInputElement;
    const searchResult: HTMLDivElement = document.getElementById('search-result-wrapper') as HTMLDivElement;
    const ul: HTMLUListElement = document.createElement('ul');
    searchResult.appendChild(ul);


    function heighLightKeywords(text: string, keywords: string[]): string {
        const keywordRE: RegExp = new RegExp('(?:' + keywords.map(keyword => window.utils.escapeRegex(keyword)).join('|') + ')', 'ig');
        let maxCnt: number = 0;
        let maxLine: string = '';
        for (const line of text.split('\n')) {
            let cnt: number = (line.match(keywordRE) || []).length;
            if (cnt >= maxCnt) {
                maxCnt = cnt;
                maxLine = line;
            }
        }
        return maxLine.replace(keywordRE, '<span class="search-match">$&</span>');
    }

    function addResult(wikiLink: IWikiLink, text: string, created: Date, keywords: string[]): void {
        const li: HTMLLIElement = document.createElement('li');
        li.classList.add('search-result');
        const href: string = window.localWiki.toURI(wikiLink);
        const path: string = window.localWiki.toPath(wikiLink);
        const html: string = [
            '<div class="search-result-heading">',
            `<a href="${href}">${path}</a>`,
                '</div>',
            '<div class="search-result-body">',
            heighLightKeywords(text, keywords),
            '</div>',
            '<div class="search-result-data">',
            window.utils.dateToStr(created),
            '</div>',
        ].join('');
        li.innerHTML = html;
        ul.appendChild(li);
    }

    function splitSeachKeyword(keyword: string): string[] {
        let keywords: string[];
        const match: RegExpMatchArray|null = keyword.match(/"[^"]*"/g);
        if (match === null) {
            keywords = keyword.split(' ');
        } else {
            keywords = match.map(str => str.slice(1, -1));
            for (const str of keyword.split(/"[^"]*"/g)) {
                keywords.push(...str.split(' '));
            }
        }
        return keywords.filter(keyword => keyword !== '');
    }

    window.ipcApi.searchPageResult((wikiLink: IWikiLink, body: string, created: Date, keywords: string[]) => {
        addResult(wikiLink, body, created, keywords);
    });

    function searchPage(): void {
        const searchValue: string = searchField.value;
        const keywords: string[] = splitSeachKeyword(searchValue);
        const params: Params = new Params();
        ul.innerHTML = '';
        const p: HTMLParagraphElement = document.createElement('p');
        ul.appendChild(p);
        window.ipcApi.searchPageByName(params.path, searchValue)
        .then(({exists, wikiLink}) => {
            if (exists) {
                const href: string = window.localWiki.toURI(wikiLink);
                p.innerHTML = `There is a page named "<a href="${href}">${searchValue}</a>" on this wiki.`;
            } else {
                const href: string = window.localWiki.toURI(wikiLink, {mode: 'edit'});
                p.innerHTML = `Create the page "<a href="${href}" class="new">${searchValue}</a>" on this wiki!`;
            }
        });
        window.ipcApi.searchPageByKeywords(params.path, keywords);
    }

    searchButton.addEventListener('click', () => {
        searchPage();
    }, false);

    searchField.addEventListener('keypress', (event: KeyboardEvent) => {
        if (event.which === 13) {
            searchPage();
        }
    }, false);


    const params: Params = new Params();
    const searchValue: string = params.getValueOf('search');
    if (searchValue === '') {
        return;
    }
    searchField.value = searchValue;
    searchPage();
})();
