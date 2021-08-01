// 標準的なマークダウンの機能をこのファイルで実装する

class TOC {
    private table: {level: number, text: string, target: HTMLElement}[] = [];

    public size(): number {
        return this.table.length;
    }

    public add(level: number, text: string, target: HTMLElement): void {
        this.table.push({level: level, text: text, target: target});
    }

    public toHTMLElement(): HTMLElement {
        const toc: HTMLElement = document.createElement('div');
        toc.className = 'toc';

        const title: HTMLElement = document.createElement('div');
        title.className = 'toc-title';

        const heading: HTMLElement = document.createElement('span');
        heading.className = 'toc-heading';
        heading.textContent = 'Contents';

        const toggle: HTMLElement = document.createElement('span');
        toggle.className = 'toc-toggle';
        toggle.textContent = 'hide';
        toggle.addEventListener('click', event => {
            const fromHidden: boolean = tocList.style.display === 'none';
            tocList.style.display = fromHidden ? 'block' : 'none';
            toggle.textContent    = fromHidden ? 'hide'  : 'show';
        });

        const tocList: HTMLElement = this.createTocList();

        toc.append(title, tocList);
        title.append(heading, toggle);
        return toc;
    }

    private createTocList(): HTMLElement {
        const tocList: HTMLElement = document.createElement('div');
        tocList.className = 'toc-list';
        let openElement: HTMLElement = tocList;
        let sectionLevel = 0;
        let sectionNumbers: number[] = [];
        for (const header of this.table) {
            if (header.level < sectionLevel) {
                for (let i = 0, len = sectionLevel - header.level; i < len; i++) {
                    if (openElement.parentElement === null) {
                        break;
                    }
                    sectionNumbers.pop();
                    openElement = openElement.parentElement;
                }
            } else if (header.level > sectionLevel) {
                for (let i = 0, len = header.level - sectionLevel; i < len; i++) {
                    const ul: HTMLElement = document.createElement('ul');
                    sectionNumbers.push(0);
                    openElement.append(ul);
                    openElement = ul;
                }
            }

            sectionLevel = header.level;
            sectionNumbers[sectionNumbers.length - 1]++;
            const sectionNumber: string = sectionNumbers.join('.');
            openElement.append(this.createTocListItem(sectionNumber, header.text, header.target));
        }
        return tocList;
    }

    private createTocListItem(sectionNumber: string, text: string, target: HTMLElement): HTMLElement {
        const tocLink: HTMLElement = document.createElement('span');
        tocLink.className = 'toc-link';
        tocLink.addEventListener('click', event => {
            const rect: DOMRect = target.getBoundingClientRect();
            scrollTo(0, rect.top);
        });

        const tocNumber: HTMLElement = document.createElement('span');
        tocNumber.className = 'toc-number';
        tocNumber.textContent = sectionNumber;

        const tocText: HTMLElement = document.createElement('span');
        tocText.textContent = text;

        const tocListItem: HTMLElement = document.createElement('li');
        tocListItem.append(tocLink);
        tocLink.append(tocNumber, tocText);
        return tocListItem;
    }
}


function createTOC(): void {
    const targets: HTMLCollectionOf<HTMLSpanElement> = document.getElementsByClassName('toc-target') as HTMLCollectionOf<HTMLSpanElement>;
    const toc: TOC = new TOC();
    if (targets.length < 3) {
        return;
    }

    function getHeading(target: HTMLSpanElement): HTMLHeadingElement {
        return target.parentElement as HTMLHeadingElement;
    }

    for (const target of targets) {
        const heading: HTMLHeadingElement = getHeading(target);
        const level: number = Number(heading.tagName[1]);
        toc.add(level, heading.innerText, heading);
    }

    const firstHeading: HTMLHeadingElement = getHeading(targets[0]);
    (firstHeading.parentElement as HTMLElement).insertBefore(toc.toHTMLElement(), firstHeading);
}


function registerCopyEvent(): void {
    const targets: HTMLCollectionOf<HTMLDivElement> = document.getElementsByClassName('copy-button') as HTMLCollectionOf<HTMLDivElement>;
    for (const target of targets) {
        target.addEventListener('click', event => {
            const pre: HTMLPreElement = target.previousElementSibling as HTMLPreElement;
            const code: string = pre.innerText;
            navigator.clipboard.writeText(code)
            .then(e => {
                showShortMessage('Copied!', 'success', 2500);
            });
        });
    }
}


View.addUpdateAction(createTOC);
View.addUpdateAction(registerCopyEvent);
