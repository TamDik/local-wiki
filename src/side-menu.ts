(() => {
    const className = {
        selected: 'selected',
        mainSection: 'main-side-menu-section',
        subSections: 'side-menu-sections',
        section: 'added-side-menu-section',
        contents: 'side-menu-contents',
        title: 'side-menu-section-title',
        content: 'side-menu-content',
        link: 'side-menu-link-content',
        text: 'side-menu-text-content',
    };

    const mainSection: HTMLDivElement = document.getElementById(className.mainSection) as HTMLDivElement;
    const sideMenuSections: HTMLDivElement = document.getElementById(className.subSections) as HTMLDivElement;

    // ドロップダウン
    const dropdown: HTMLDivElement = document.createElement('div');
    document.body.appendChild(dropdown);
    dropdown.classList.add('dropdown-menu');

    function removeSelectedClass(): void {
        const els1: HTMLCollectionOf<Element> = mainSection.getElementsByClassName(className.selected);
        for (const el of els1) {
            el.classList.remove(className.selected);
        }

        const els2: HTMLCollectionOf<Element> = sideMenuSections.getElementsByClassName(className.selected);
        for (const el of els2) {
            el.classList.remove(className.selected);
            const innerEls: HTMLCollectionOf<Element> = el.getElementsByClassName(className.selected);
            for (const inner of innerEls) {
                inner.classList.remove(className.selected);
            }
        }
    }

    function addEventSideMenuContents(el: HTMLElement): void {
        el.addEventListener('contextmenu', (event) => {
            event.preventDefault();

            const sectionEl: HTMLElement = event.currentTarget as HTMLElement;
            const isMain: boolean = sectionEl === mainSection;
            let clicked: 'link'|'text'|'section'  = 'section';
            let contentEl: HTMLElement|null = event.target as HTMLElement;
            while (contentEl && contentEl !== sectionEl) {
                if (contentEl.classList.contains(className.link)) {
                    clicked = 'link';
                    break;
                }
                if (contentEl.classList.contains(className.text)) {
                    clicked = 'text';
                    break;
                }
                contentEl = contentEl.parentElement;
            }

            removeSelectedClass();
            sectionEl.classList.add(className.selected);
            if (contentEl) {
                contentEl.classList.add(className.selected);
            }

            // 表示部分の作成
            dropdown.innerHTML = '';
            function addDropdownItem(text: string): HTMLElement {
                const span: HTMLSpanElement = document.createElement('span');
                span.classList.add('dropdown-item');
                span.innerText = text;
                dropdown.appendChild(span);
                return span;
            }

            function addDivider(): void {
                const div: HTMLDivElement = document.createElement('div');
                div.classList.add('dropdown-divider');
                dropdown.appendChild(div);
            }

            if (!isMain) {
                addDropdownItem('Add Section').addEventListener('click', () => {
                    addSection(sectionEl);
                }, false);
            }

            addDropdownItem('Add link').addEventListener('click', () => {
                addLinkContext(sectionEl);
            }, false);
            addDropdownItem('Add text').addEventListener('click', () => {
                addTextContent(sectionEl);
            }, false);
            if (!isMain || clicked !== 'section') {
                addDivider();
            }
            if (!isMain) {
                addDropdownItem('Remove Section').addEventListener('click', () => {
                    sectionEl.remove();
                }, false);
            }
            if (clicked !== 'section') {
                addDropdownItem(`Remove ${clicked}`).addEventListener('click', () => {
                    if (contentEl) {
                        contentEl.remove();
                    }
                }, false);
            }

            // 表示
            dropdown.style.display = 'block';
            const size = {x: event.pageX, y: event.pageY};
            const offset = {x: dropdown.offsetWidth, y: dropdown.offsetHeight};
            if (event.y + offset.y > window.innerHeight) {
                size.y -= offset.y;
            }
            if (event.x + offset.x > window.innerWidth) {
                size.x -= offset.x;
            }
            dropdown.style.top = `${size.y}px`;
            dropdown.style.left = `${size.x}px`;
        });
    }

    document.body.addEventListener('click', () => {
        removeSelectedClass();
        dropdown.style.display="none";
    });

    Sortable.create(sideMenuSections, {
        group: 'sections',
        ghostClass: className.selected,
        animation: 150,
        fallbackOnBody: true,
        swapThreshold: 0.5,
    });

    function createSortableSideMenuContents(el: HTMLElement): Sortable {
        return Sortable.create(el, {
            group: 'contents',
            ghostClass: className.selected,
            animation: 150,
            fallbackOnBody: true,
            swapThreshold: 0.3,
        });
    }

    addEventSideMenuContents(mainSection);
    createSortableSideMenuContents(mainSection.getElementsByClassName(className.contents)[0] as HTMLDivElement);

    function addSection(beforeSection: HTMLElement|null, title: string=''): HTMLElement {
        const section: HTMLDivElement = document.createElement('div');
        const input: HTMLInputElement = document.createElement('input');
        const contetsDiv: HTMLDivElement = document.createElement('div');
        section.classList.add(className.section);
        input.type = 'text';
        input.value = title;
        input.classList.add(className.title);
        input.placeholder = 'section';
        contetsDiv.classList.add(className.contents, 'list-group');

        section.appendChild(input);
        section.appendChild(contetsDiv);
        if (beforeSection) {
            beforeSection.after(section);
        } else {
            sideMenuSections.appendChild(section);
        }
        createSortableSideMenuContents(contetsDiv);
        addEventSideMenuContents(section);
        return section;
    }

    function addTextContent(section: HTMLElement, value: string=''): void {
        const text: HTMLDivElement = document.createElement('div');
        text.classList.add('list-group-item', className.content, className.text)
        text.innerHTML = `<input type="text" class="border-0" placeholder="text" value="${value}">`;
        section.getElementsByClassName(className.contents)[0].appendChild(text);
    }

    function addLinkContext(section: HTMLElement, text: string='', path: string=''): void {
        const link: HTMLDivElement = document.createElement('div');
        link.classList.add('list-group-item', className.content, className.link);
        link.innerHTML = `[<input type="text" placeholder="title" value="${text}">]` +
                         `(<input type="text" placeholder="path" value="${path}">)`;
        section.getElementsByClassName(className.contents)[0].appendChild(link);
    }

    const addSectionButton: HTMLButtonElement = document.getElementById('add-section-button') as HTMLButtonElement;
    addSectionButton.addEventListener('click', () => {
        addSection(null);
    }, false);

    // 編集前の初期化
    function setSection(section: HTMLElement, contents: SectionData): void {
        for (const content of contents) {
            if (content.type === 'text') {
                addTextContent(section, content.value);
            } else if (content.type === 'link') {
                addLinkContext(section, content.text, content.path);
            }
        }
    }

    function setSideMenuEditor(main: SectionData, sub: {title: string, data: SectionData}[]): void {
        setSection(mainSection, main);
        for (const {title, data} of sub) {
            const section: HTMLElement = addSection(null, title);
            setSection(section, data);
        }
    }

    // 編集結果の取得
    function getSectionData(section: Element): SectionData {
        const data: SectionData = [];
        const contents: HTMLCollectionOf<Element> = section.getElementsByClassName(className.content);
        for (const content of contents) {
            const inputs: HTMLCollectionOf<HTMLInputElement> = content.getElementsByTagName('input');
            let contentData: ContentData;
            if (content.classList.contains(className.link)) {
                contentData = {type: 'link', text: inputs[0].value, path: inputs[1].value};
                data.push(contentData);
            } else if (content.classList.contains(className.text)) {
                contentData = {type: 'text', value: inputs[0].value};
                data.push(contentData);
            }
        }
        return data;
    }

    // 保存
    const saveButton: HTMLInputElement = document.getElementById('save-side-menu-button') as HTMLInputElement;
    saveButton.addEventListener('click', () => {
        const mainData: SectionData = getSectionData(mainSection);
        const subData: {title: string, data: SectionData}[] = [];
        for (const section of sideMenuSections.getElementsByClassName(className.section)) {
            const titleInput: HTMLInputElement = section.getElementsByClassName(className.title)[0] as HTMLInputElement;
            const title: string = titleInput.value;
            const data: SectionData = getSectionData(section);
            subData.push({title, data});
        }
        window.ipcApi.updateSideMenu(mainData, subData)
        .then(result => {
            location.href = location.href;
        });
    }, false);

    window.ipcApi.getSideMenuData()
    .then(({main, sub}) => {
        setSideMenuEditor(main, sub);
    });

})();
