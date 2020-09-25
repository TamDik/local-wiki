// TOC
class TOC {
    public INTERNAL_LINK_CLASS_NAME: string = 'internal-link';
    private table: {level: number, text: string, id: string}[] = [];
    public constructor(html: string) {
        const parser: DOMParser = new DOMParser();
        const doc: Document = parser.parseFromString(html, "text/html");
        const nodeList: NodeList = doc.querySelectorAll('body > h1, body > h2, body > h3, body > h4, body > h5, body > h6');

        for (let i = 0, len = nodeList.length; i < len; i++) {
            const node: Node = nodeList[i];
            if (!(node instanceof Element)) {
                continue;
            }
            const tag: string = node.tagName;
            const text: string = node.textContent ? node.textContent : '';
            const id: string = node.id;
            this.add(Number(tag[1]), text, id);
        }
    }

    public size(): number {
        return this.table.length;
    }

    public add(level: number, text: string, id: string): void {
        this.table.push({level: level, text: text, id: id});
    }

    public get HTMLElement(): HTMLElement {
        return this.createTocElement();
    }

    private createTocElement(): HTMLElement {
        const toc: HTMLElement = document.createElement('div');
        toc.className = 'toc';

        const title: HTMLElement = document.createElement('div');
        title.className = 'toc-title';

        const heading: HTMLElement = document.createElement('h2');
        heading.className = 'toc-heading';
        heading.textContent = 'Contents';

        const toggle: HTMLElement = document.createElement('span');
        toggle.className = 'toc-toggle';
        toggle.textContent = 'hide';
        toggle.addEventListener('click', event => {
            const fromHidden: boolean = toggle.style.display === 'none';
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
                for (var i = 0, len = sectionLevel - header.level; i < len; i++) {
                    if (openElement.parentElement === null) {
                        break;
                    }
                    sectionNumbers.pop();
                    openElement = openElement.parentElement;
                }
            } else if (header.level > sectionLevel) {
                for (var i = 0, len = header.level - sectionLevel; i < len; i++) {
                    const ul: HTMLElement = document.createElement('ul');
                    sectionNumbers.push(0);
                    openElement.append(ul);
                    openElement = ul;
                }
            }

            sectionLevel = header.level;
            sectionNumbers[sectionNumbers.length - 1]++;
            const sectionNumber: string = sectionNumbers.join('.');
            openElement.append(this.createTocListItem(sectionNumber, header.text, header.id));
        }
        return tocList;
    }

    private createTocListItem(sectionNumber: string, text: string, id: string): HTMLElement {
        const tocLink: HTMLElement = document.createElement('a');
        tocLink.className = `${this.INTERNAL_LINK_CLASS_NAME} toc-link`;
        tocLink.setAttribute('href', '#' + id);
        tocLink.setAttribute('title', id);

        const tocNumber: HTMLElement = document.createElement('span');
        tocNumber.className = 'toc-number';
        tocNumber.textContent = sectionNumber;

        const tocText: HTMLElement = document.createElement('span');
        tocText.className = 'toc-text';
        tocText.textContent = text;

        const tocListItem: HTMLElement = document.createElement('li');
        tocListItem.append(tocLink);
        tocLink.append(tocNumber, tocText);
        return tocListItem;
    }
}
