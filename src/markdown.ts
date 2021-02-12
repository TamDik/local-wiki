import marked from 'marked';

type WikiMDOption = {
    isWikiLink?: (href: string) => boolean,
};

type iswikilink = (href: string) => boolean;
class WikiMD {
    private value: string;
    private isWikiLink: iswikilink;
    private readonly magicHandlers: IMagicHandler[] = [];
    public static readonly EXTERNAL_CLASS_NAME = 'external';
    public static readonly INTERNAL_CLASS_NAME = 'internal';
    public static readonly NEW_CLASS_NAME = 'new';

    constructor(options: WikiMDOption) {
        this.value = '';
        this.isWikiLink = options.isWikiLink || (href => false);
    }

    public setValue(value: string): void {
        this.value = value;
    }

    public toHTML(): string {
        marked.setOptions({
            highlight: (code: string, language: string) => {
                const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
                return hljs.highlight(validLanguage, code).value;
            },
            pedantic: false,
            gfm: true,
            silent: false
        });
        const renderer: marked.Renderer = new marked.Renderer();
        renderer.link = (href: string, title: string|null, text: string) => this.link(href, title, text, this.isWikiLink);
        renderer.image = (href: string, title: string|null, text: string) => this.image(href, title, text, this.isWikiLink);
        renderer.text = (text: string) => this.text(text, this.magicHandlers);
        marked.use({renderer});
        return marked(this.value);
    }

    private className(href: string, isWikiLink: iswikilink): string {
        if (isWikiLink(href)) {
            return WikiMD.INTERNAL_CLASS_NAME;
        } else {
            return WikiMD.EXTERNAL_CLASS_NAME;
        }
    }

    private link(href: string, title: string|null, text: string, isWikiLink: iswikilink): string {
        title = title === null ? '' : title;
        const className: string = this.className(href, isWikiLink);
        if (isWikiLink(href)) {
            href = `?path=${href}`
        }
        return `<a class="${className}" href="${href}" title="${title}">${text}</a>`;
    }

    private image(href: string, title: string|null, text: string, isWikiLink: iswikilink): string {
        title = title === null ? '' : title;
        const src: string = href;
        const alt: string = text;
        const className: string = this.className(href, isWikiLink);
        return `<img class="${className}" src="${src}" alt="${alt}" title="${title}" decoding="async">`;
    }

    private text(text: string, magicHandlers: IMagicHandler[]): string {
        const MAGIC_PATTERN: RegExp = /{{[^{}]+}}/g;
        const magicMatches = text.match(MAGIC_PATTERN);
        if (!magicMatches) {
            return text;
        }
        for (const magic of magicMatches) {
            const innerMagic: string = magic.replace(/(^{{|}}$)/g, '');
            for (const magicHandler of magicHandlers) {
                if (!magicHandler.isTarget(innerMagic)) {
                    continue;
                }
                text = text.replace(magic, magicHandler.expand(innerMagic));
            }
        }
        return text;
    }

    public addMagicHandler(magicHandler: IMagicHandler): void {
        this.magicHandlers.push(magicHandler);
    }
}


interface IMagicHandler {
    // 中身がこのハンドラーが対象とする物であるかを判定
    isTarget(content: string): boolean;

    // 中身を展開
    expand(content: string): string;
}


abstract class FileHandler implements IMagicHandler {
    private readonly extensions: string[];

    public constructor(extensions: string[]) {
        this.extensions = extensions;
    }

    public addExtention(extensions: string[]) {
        this.extensions.push(...extensions);
    }

    public isTarget(content: string): boolean {
        const [path, ...options]: string[] = content.split('|');
        for (const extension of this.extensions) {
            if (path.endsWith('.' + extension)) {
                return true;
            }
        }
        return false;
    }

    public expand(content: string): string {
        const [path, ...options]: string[] = content.split('|');
        return this.createHTML(path, options);
    }

    protected abstract createHTML(path: string, options: string[]): string;
}


type ImageFormat = 'none'|'frameless'|'border'|'frame'|'thumb';

class ImageFileHandler extends FileHandler {
    public constructor() {
        super(['jpeg', 'jpg', 'png', 'gif', 'tiff']);
    }

    public createHTML(path: string, options: string[]): string {
        const styleResults = this.styleOptions(options);

        let replaceCaption: string;
        let caption: string;
        if (styleResults.remains.length === 0) {
            replaceCaption = '';
            caption = path;
        } else {
            const lastRemain: string = styleResults.remains.slice(-1)[0];
            replaceCaption = lastRemain;
            caption = lastRemain;
        }

        const alt: string = styleResults.alt !== '' ? styleResults.alt : caption;  // FIXME: captionのスタイルを除去

        const classNames: string[] = [...styleResults.classNames];
        const img: string = this.createImgTag(path, alt, classNames, styleResults.props);

        let html: string = styleResults.openTag;
        if (styleResults.link === '') {
            html += img;
        } else if (styleResults.link === null) {
            html += `<a href="${path}" class="image">` + img + '</a>';
        } else {
            // FIXME: styleResults.link に特殊文字 (空白文字等)が来たときエスケープ
            html += `<a href="${styleResults.link}">` + img + '</a>';
        }
        html += styleResults.closeTag;
        return html.replace(/\[:caption:\]/g, replaceCaption)
                   .replace(/\[:link:\]/g, styleResults.link === null ? path : styleResults.link);
    }

    private createImgTag(src: string, alt: string, classNames: string[], props: string[]): string {
        let img: string = `<img alt="${alt}" src="${src}" decoding="async"`;
        classNames = classNames.filter(name => name !== '');
        if (classNames.length !== 0) {
            img += ' class="' + classNames.join(' ') + '"';
        }
        for (const prop of props) {
            img += ' ' + prop;
        }
        img += '>';
        return img;
    }

    private styleOptions(options: string[]): {classNames: string[], props: string[], openTag: string, closeTag: string, remains: string[], link: string|null, alt: string} {
        const classNames: string[] = [];
        const props: string[] = [];
        let openTag: string = '';
        let closeTag: string = '';

        const fResult = this.formatOptions(options);
        openTag = fResult.openTag + openTag;
        closeTag = closeTag + fResult.closeTag;
        if (fResult.className) {
            classNames.push(fResult.className);
        }

        // size
        const isFrame: boolean = fResult.imageFormat === 'frame';
        const sResult = this.sizeOptions(fResult.remains, isFrame);
        props.push(...sResult.props);

        // alt
        const aResult = this.altOptions(sResult.remains);
        const alt: string = aResult.alt;

        // link
        const lResult = this.linkOptions(aResult.remains);
        const link = lResult.link;

        // horizontalAlignment
        const isFrameOrThumb: boolean = fResult.imageFormat === 'frame' || fResult.imageFormat === 'thumb';
        const hResult = this.horizontalOptions(lResult.remains, isFrameOrThumb);
        openTag  = hResult.openTag + openTag;
        closeTag = closeTag + hResult.closeTag;

        return {classNames, props, openTag, closeTag, link, alt, remains: hResult.remains};
    }

    private formatOptions(options: string[]): {remains: string[], className: string, openTag: string, closeTag: string, imageFormat: ImageFormat} {
        let exists: boolean = false;
        let openTag: string = '';
        let closeTag: string = '';
        const remains: string[] = [];
        let className: string = '';
        let imageFormat: ImageFormat = 'none';
        for (const option of options) {
            const result = this.format(option);
            if (!result) {
                remains.push(option);
                continue;
            }
            if (!exists) {
                className = result.className;
                openTag = result.openTag;
                closeTag = result.closeTag;
                imageFormat = result.imageFormat;
            }
            exists = true;
        }
        return {remains, className, openTag, closeTag, imageFormat};
    }

    private sizeOptions(options: string[], isFrame: boolean): {remains: string[], props: string[]} {
        let exists: boolean = false;
        const remains: string[] = [];
        const props: string[] = [];
        for (const option of options) {
            const result = this.size(option);
            if (!result) {
                remains.push(option);
                continue;
            }
            if (!isFrame && !exists) {
                props.push(...result);
            }
            exists = true;
        }
        return {remains, props};
    }

    private altOptions(options: string[]): {remains: string[], alt: string} {
        let alt: string = '';
        const remains: string[] = [];
        let exists: boolean = false;
        for (const option of options) {
            const result = this.alt(option);
            if (!result) {
                remains.push(option);
                continue;
            }
            if (!exists) {
                alt = result;
            }
            exists = true;
        }
        return {remains, alt};
    }

    private linkOptions(options: string[]): {remains: string[], link: string|null} {
        const remains: string[] = [];
        let exists: boolean = false;
        let link: string|null = null;
        for (const option of options) {
            const result = this.linkTarget(option);
            if (result === null) {
                remains.push(option);
                continue;
            }
            if (!exists) {
                link = result;
            }
            exists = true;
        }
        return {remains, link};
    }

    private horizontalOptions(options: string[], isFrameOrThumb: boolean): {remains: string[], openTag: string, closeTag: string} {
        const remains: string[] = [];
        let exists: boolean = false;
        let openTag: string = '';
        let closeTag: string = '';
        for (const option of options) {
            const result = this.horizontalAlignment(option);
            if (!result) {
                remains.push(option);
                continue;
            }
            if (!exists) {
                openTag  = result.openTag;
                closeTag = result.closeTag;
            }
            exists = true;
        }

        if (isFrameOrThumb && !exists) {
            openTag  = '<div class="thumb tright">';
            closeTag = '</div>';
        }
        return {remains, openTag, closeTag};
    }

    private format(option: string): {openTag: string, closeTag: string, className: string, imageFormat: ImageFormat}|null {
        let openTag: string = '';
        let closeTag: string = '';
        let className: string = '';
        let imageFormat: ImageFormat = 'none';
        if (option === 'frameless') {
            imageFormat = 'frameless';
            return {openTag, closeTag, className, imageFormat};
        }
        if (option === 'border') {
            className = 'thumbborder';
            imageFormat = 'border';
            return {openTag, closeTag, className, imageFormat};
        }
        if (option === 'frame') {
            openTag  = '<div class="thumbinner">';
            closeTag =   '<div class="thumbcaption">[:caption:]</div>' +
                       '</div>';
            className = 'thumbimage';
            imageFormat = 'frame';
            return {openTag, closeTag, className, imageFormat};
        }
        if (option === 'thumb' ||  option === 'thumbnail') {
            openTag  = '<div class="thumbinner">';
            closeTag =   '<div class="thumbcaption">' +
                           '<div class="magnify">' +
                             '<a href="[:link:]" class="internal" title="Enlarge"></a>' +
                           '</div>' +
                           '[:caption:]' +
                         '</div>' +
                       '</div>';
            className = 'thumbimage';
            imageFormat = 'thumb';
            return {openTag, closeTag, className, imageFormat};
        }
        return null;
    }

    private size(option: string): string[]|null {
        const wMatch: RegExpMatchArray|null = option.match(/^(\d+)\s*px$/);
        if (wMatch) {
            const width: string = wMatch[1];
            return [`width="${width}"`];
        }
        const hMatch: RegExpMatchArray|null = option.match(/^x(\d+)\s*px$/);
        if (hMatch) {
            const height: string = hMatch[1];
            return [`height="${height}"`];
        }
        const whMatch: RegExpMatchArray|null = option.match(/^(\d+)x(\d+)\s*px$/);
        if (whMatch) {
            const width: string = whMatch[1];
            const height: string = whMatch[2];
            return [`width="${width}"`, `height="${height}"`];
        }
        // TODO: upright
        return null;
    }

    private horizontalAlignment(option: string): {openTag: string, closeTag: string}|null {
        let openTag: string = '';
        let closeTag: string = '';
        if (option === 'left') {
            openTag  = '<div class="floatleft">';
            closeTag = '</div>';
            return {openTag, closeTag};
        }
        if (option === 'right') {
            openTag  = '<div class="floatright">';
            closeTag = '</div>';
            return {openTag, closeTag};
        }
        if (option === 'center') {
            openTag  = '<div class="center">' +
                         '<div class="floatnone">';
            closeTag =   '</div>' +
                       '</div>';
            return {openTag, closeTag};
        }
        if (option === 'none') {
            openTag  = '<div class="floatnone">';
            closeTag = '</div>';
            return {openTag, closeTag};
        }
        return null;
    }

    private verticalAlignment(option: string): string|null {
        // TODO
        if (option === 'baseline') {
        }
        if (option === 'sub') {
        }
        if (option === 'super') {
        }
        if (option === 'top') {
        }
        if (option === 'text-top') {
        }
        if (option === 'middle') {
        }
        if (option === 'bottom') {
        }
        return null;
    }

    private linkTarget(option: string): string|null {
        const PATTERN: RegExp = /^link=(.*)$/;
        const match: RegExpMatchArray|null = option.match(PATTERN);
        if (match) {
            return match[1];
        }
        return null;
    }

    private alt(option: string): string|null {
        const PATTERN: RegExp = /^alt=(.*)$/;
        const match: RegExpMatchArray|null = option.match(PATTERN);
        if (match) {
            return match[1];
        }
        return null;
    }
}


type PDFFormat = 'preview'|'link';
class PDFFileHandler extends FileHandler {
    private readonly defaultSize = {width: '100%', height: 'calc(100vh - 300px)'};

    public constructor() {
        super(['pdf']);
    }

    protected createHTML(path: string, options: string[]): string {
        const {style, pdfFormat, remains} = this.styleOptions(options);
        const title: string = remains.length === 0 ? path : remains.slice(-1)[0];
        let html: string;

        switch (pdfFormat) {
            case 'preview':
                html = `<object style="${style}" type="application/pdf" data="${path}">` +
                         '<div class="alert alert-warning">' +
                           `<p>${path} could not be displayed. </p>` +
                         '</div>' +
                       '</object>';
                    break;
            case 'link':
                html = `<a href="${path}">${title}</a>`;
                break
        }
        return html;
    }

    private styleOptions(options: string[]): {style: string, pdfFormat: PDFFormat, remains: string[]} {
        // format
        const fResult = this.formatOptions(options);
        const pdfFormat: PDFFormat = fResult.pdfFormat;

        // size
        const sResult = this.sizeOptions(fResult.remains);
        const style: string = `width: ${sResult.width}; height: ${sResult.height};`;

        return {style, pdfFormat, remains: sResult.remains};
    }

    private sizeOptions(options: string[]): {width: string, height: string, remains: string[]} {
        const size = {width: this.defaultSize.width, height: this.defaultSize.height};
        const remains: string[] = [];

        let exists: boolean = false;
        for (const option of options) {
            const result = this.size(option);
            if (result === null) {
                remains.push(option);
                continue;
            }
            if (!exists) {
                const {width, height} = result;
                if (width) {
                    size.width = `${width}px`;
                }
                if (height) {
                    size.height = `${height}px`;
                }
            }
            exists = true;
        }
        return {...size, remains};
    }

    private formatOptions(options: string[]): {pdfFormat: PDFFormat, remains: string[]} {
        const remains: string[] = [];
        let pdfFormat: PDFFormat = 'preview';
        let exists: boolean = false;
        for (const option of options) {
            const result = this.format(option);
            if (result === null) {
                remains.push(option);
                continue;
            }
            if (!exists) {
                pdfFormat = result;
            }
            exists = true;
        }
        return {pdfFormat, remains};
    }

    private size(option: string): {width?: string, height?: string}|null {
        const wMatch: RegExpMatchArray|null = option.match(/^(\d+)\s*px$/);
        if (wMatch) {
            const width: string = wMatch[1];
            return {width};
        }
        const hMatch: RegExpMatchArray|null = option.match(/^x(\d+)\s*px$/);
        if (hMatch) {
            const height: string = hMatch[1];
            return {height};
        }
        const whMatch: RegExpMatchArray|null = option.match(/^(\d+)x(\d+)\s*px$/);
        if (whMatch) {
            const width: string = whMatch[1];
            const height: string = whMatch[2];
            return {width, height};
        }
        return null;
    }

    private format(option: string): PDFFormat|null {
        if (option === 'link') {
            return 'link';
        }
        if (option === 'preview') {
            return 'preview';
        }
        return null;
    }
}


export {WikiMD, ImageFileHandler, PDFFileHandler}
