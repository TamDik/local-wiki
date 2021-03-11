(() => {
    const BULLET_CLASS_NAME: string = 'category-tree-bullet'
    const params: Params = new Params();
    type ItemStatus = 'none'|'collapsed'|'expanded';

    addDnamicEventLister('click', 'span', (event: Event, element: HTMLElement) => {
        if (!element.classList.contains(BULLET_CLASS_NAME)) {
            return false;
        }
        bulletClickEvent(element)
        return true;
    });

    function bulletClickEvent(bullet: HTMLElement): void {
        const status: ItemStatus = bullet.dataset.status as ItemStatus;
        const section: HTMLElement = (bullet.parentElement as HTMLElement).parentElement as HTMLElement;
        const children: HTMLElement = section.lastChild as HTMLElement;
        if (status === 'none') {
        } else if (status === 'expanded') {
            collapseCategory(children, bullet);
        } else if (status === 'collapsed') {
            const categoryPath: string|undefined = bullet.dataset.category;
            if (categoryPath === undefined) {
                expandCategory(null, children, bullet);
            } else {
                expandCategory(categoryPath, children, bullet);
            }
        }
    }

    function collapseCategory(children: HTMLElement, bullet: HTMLElement) {
        children.classList.add('d-none');
        bullet.dataset.status = 'collapsed';
    }

    function expandCategory(categoryPath: string|null, children: HTMLElement, bullet: HTMLElement) {
        if (children.childElementCount !== 0) {
            children.classList.remove('d-none');
        } else {
            window.ipcApi.retrieveChildCategories(categoryPath, params.namespace)
            .then(categories => {
                for (const {wikiLink, hasChildren} of categories) {
                    appendCategory(children, wikiLink, hasChildren)
                }
            });
        }
        bullet.dataset.status = 'expanded';
    }

    async function appendCategory(children: HTMLElement, wikiLink: IWikiLink, hasChildren: boolean): Promise<void> {
        const fullPath: string = window.localWiki.toFullPath(wikiLink);

        const section: HTMLDivElement = document.createElement('div');
        const item: HTMLDivElement = document.createElement('div');
        const nextChildren: HTMLDivElement = document.createElement('div');
        const bullet: HTMLSpanElement = document.createElement('span');
        const anchor: HTMLAnchorElement = document.createElement('a');

        section.classList.add('category-tree-section');
        item.classList.add('category-tree-item');
        nextChildren.classList.add('category-tree-children');
        bullet.classList.add('category-tree-bullet');
        bullet.dataset.category = fullPath;
        bullet.dataset.status = hasChildren ? 'collapsed' : 'none';
        anchor.href = window.localWiki.toURI(wikiLink);
        anchor.innerText = fullPath;

        children.appendChild(section);
        section.appendChild(item);
        section.appendChild(nextChildren)
        item.appendChild(bullet);
        item.appendChild(anchor);
    }
})();
