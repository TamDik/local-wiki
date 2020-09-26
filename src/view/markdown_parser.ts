const EXTERNAL_LINK_CLASS_NAME  = 'external-link';
const EXTERNAL_IMAGE_CLASS_NAME = 'external-image';
const INTERNAL_IMAGE_CLASS_NAME = 'internal-image';
const INTERNAL_LINK_CLASS_NAME  = 'internal-link';
const NOT_EXISTS_CLASS_NAME = 'not-exists';

function wikimdToElement(markdown: string, tocMin: number=3): HTMLElement {
    const wrapper: HTMLElement = document.createElement('div');
    const html: string = window.marked.marked(markdown);
    const toc: TOC = new TOC(html);
    wrapper.innerHTML = html;
    expandInternalImageSrc(wrapper);
    markNotExistsInternalLink(wrapper);

    if (toc.size() >= tocMin) {
        const selector: string = ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6';
        const header: HTMLElement|null = wrapper.querySelector(selector);
        if (header instanceof HTMLElement) {
            wrapper.insertBefore(toc.HTMLElement, header);
        }
    }
    return wrapper;
}

// marked
window.marked.setOptions({
    highlight: (code: string, language: string) => {
        const validLanguage = window.hljs.getLanguage(language) ? language : 'plaintext';
        return window.hljs.highlight(validLanguage, code).value;
    },
    pedantic: false,
    gfm: true,
    silent: false
});

const renderer: marked.Renderer = window.marked.createRenderer();

renderer.link = (href: string, title: string|null, text: string): string => {
    title = title === null ? '' : title;
    if (isWikiLink(href)) {
        return internalAnchor(href, title, text);
    } else {
        return externalAnchor(href, title, text);
    }
};

renderer.image = (href: string, title: string|null, text: string): string => {
    title = title === null ? '' : title;
    if (!isWikiLink(href)) {
        return externalImage(href, text, title, '');
    }
    try {
        const {wikiNS, wikiType, wikiName} = parseWikiLocation(href);
        return internalImage(wikiNS, wikiName, text, '');
    } catch (e) {
        return externalImage(href, text, title, '');
    }
}

renderer.text = (text: string): string => {
    const MAGIC_PATTERN: RegExp = /{{[^{}]+}}/g
    const magicMatches = text.match(MAGIC_PATTERN);
    const magicHandler: MagicHandler = new MagicFileHandler();
    if (magicMatches) {
        for (const magic of magicMatches) {
            const innerMagic: string = magic.replace(/(^{{|}}$)/g, '');
            text = text.replace(magic, magicHandler.request(innerMagic));
        }
    }
    return text;
}

marked.use({renderer});


abstract class MagicHandler {
    private nextHandler: MagicHandler | null = null;

    public setNext(handler: MagicHandler): MagicHandler {
        this.nextHandler = handler;
        return handler;
    }

    public request(magic: string): string {
        const result: string | null = this.resolve(magic);
        if (typeof(result) === 'string') {
            return result;
        }

        if (this.nextHandler === null) {
            return magic;
        }
        return this.nextHandler.request(magic);
    }

    protected abstract resolve(magic: string): string | null;
}

// fileLocation := wikiNS:File:wikiName
// {{fileLocation}}
// {{fileLocation|alt}}
// {{fileLocation|style|alt}}
class MagicFileHandler extends MagicHandler {
    protected resolve(magic: string): string | null {
        try {
            return this.parseMagic(magic);
        } catch (e) {
            return null;
        }
    }

    // TODO 画像以外に対応
    private parseMagic(magic: string): string | null {
        const barSeparatedMagic: string[] = magic.split('|');
        const len: number = barSeparatedMagic.length;
        if (len === 0 || len > 3) {
            return null;
        }
        const src: string = barSeparatedMagic[0];
        const {wikiNS, wikiType, wikiName} = parseWikiLocation(src);
        if (wikiType !== 'File') {
            return null;
        }
        let alt: string   = (len === 1) ? wikiName : barSeparatedMagic[barSeparatedMagic.length-1];
        let style: string = (len === 3) ? barSeparatedMagic[2] : '';
        return internalImage(wikiNS, wikiName, alt, style);
    }
}


function externalAnchor(href: string, title: string, text: string): string {
    return anchorTang(href, title, text, EXTERNAL_LINK_CLASS_NAME);
}

function internalAnchor(href: string, title: string, text: string): string {
    return anchorTang(href, title, text, INTERNAL_LINK_CLASS_NAME);
}

function anchorTang(href: string, title: string, text: string, className: string): string {
    return `<a class="${className}" href="${href}" title="${title}">${text}</a>`;
}


function externalImage(src: string, alt: string, title: string, style: string) {
    return imageTag(src, alt, title, EXTERNAL_IMAGE_CLASS_NAME, style);
}

function internalImage(wikiNS: string, wikiName: string, alt: string, style: string): string {
    const title: string = wikiNS + ':' + wikiName;
    return imageTag('#', alt, title, INTERNAL_IMAGE_CLASS_NAME, style);
}

function imageTag(src: string, alt: string, title: string, className: string, style: string): string {
    return `<img class="${className}" src="${src}" alt="${alt}" title="${title}" style="${style}" decoding="async">`;
}


// 内部画像の時はメインプロセスと通信してsrcを展開する。存在しなければ NOT_EXISTS_CLASS_NAME を付与する。
// 画像の数が増えると ipc 通信が増えレンダリング に時間がかかってしまうので非同期で展開する。
async function expandInternalImageSrc(element: Element): Promise<void> {
    const nodeList: NodeList = element.querySelectorAll('img.' + INTERNAL_IMAGE_CLASS_NAME);
    for (let i = 0, len = nodeList.length; i < len; i++) {
        const node: Node = nodeList[i];
        if (!(node instanceof Element)) {
            continue;
        }
        getInternalImageFilepath(node)
        .then(filepath => {
            if (filepath === null) {
                node.className += ' ' + NOT_EXISTS_CLASS_NAME;
            } else {
                node.setAttribute('src', filepath)
            }
        });
    }
}

async function getInternalImageFilepath(img: Element): Promise<string|null> {
    const title: string | null = img.getAttribute('title');
    if (title === null) {
        return null;
    }
    try {
        const [wikiNS, wikiName] = title.split(':');
        return IpcAdapter.getFilepath(wikiNS, wikiName);
    } catch (e) {
        return null;
    }
}


// 内部リンクが無効の時は NOT_EXISTS_CLASS_NAME クラスを付与する。
async function markNotExistsInternalLink(element: Element): Promise<void> {
    const nodeList: NodeList = element.querySelectorAll('a.' + INTERNAL_LINK_CLASS_NAME);
    for (let i = 0, len = nodeList.length; i < len; i++) {
        const node: Node = nodeList[i];
        if (!(node instanceof Element)) {
            continue;
        }
        existsInternalLink(node)
        .then(exists => {
            if (exists) {
                return;
            }
            node.className += ' ' + NOT_EXISTS_CLASS_NAME;
        })
    }
}

async function existsInternalLink(anchor: Element): Promise<boolean> {
    const href: string|null = anchor.getAttribute('href');
    if (href === null) {
        return false;
    }
    try {
        const {wikiNS, wikiType, wikiName} = parseWikiLocation(href);
        return IpcAdapter.existsContent(wikiNS, wikiType, wikiName);
    } catch (e) {
        return false;
    }
}
