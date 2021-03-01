import marked from 'marked';
import hljs from 'highlight.js';


type ToWikiURI = (href: string) => string;
type IsWikiLink = (href: string) => boolean;
type WikiMDOption = {
    toWikiURI: ToWikiURI,
    isWikiLink?: IsWikiLink,
};
class WikiMD {
    private value: string;
    private isWikiLink: IsWikiLink;
    private toWikiURI: ToWikiURI;
    private readonly magicHandlers: IMagicHandler[] = [];
    public static readonly NEW_CLASS_NAME = 'new';

    constructor(options: WikiMDOption) {
        this.value = '';
        this.toWikiURI = options.toWikiURI;
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
        marked.use({renderer});
        const html: string = marked(this.value);
        return this.expandMagics(html, this.magicHandlers);
    }

    private link(href: string, title: string|null, text: string, isWikiLink: IsWikiLink): string {
        title = title === null ? '' : title;
        if (isWikiLink(href)) {
            href = this.toWikiURI(href);
        }
        return `<a href="${href}" title="${title}">${text}</a>`;
    }

    private image(href: string, title: string|null, text: string, isWikiLink: IsWikiLink): string {
        title = title === null ? '' : title;
        const alt: string = text;
        const isInternal: boolean = isWikiLink(href);
        const src: string = isInternal ? this.toWikiURI(href) : href;
        let img: string = `<img src="${src}" alt="${alt}" title="${title}" decoding="async" width="300">`;
        if (isInternal) {
            img = `<a href="${this.toWikiURI(href)}" class="image">${img}</a>`;
        }
        return img;
    }

    private expandMagics(html: string, magicHandlers: IMagicHandler[]): string {
        const MAGIC_PATTERN: RegExp = /{{[^{}]+}}/g;
        const magicMatches: RegExpMatchArray|null = html.match(MAGIC_PATTERN);
        if (!magicMatches) {
            return html;
        }
        for (const magic of magicMatches) {
            const innerMagic: string = magic.replace(/(^{{|}}$)/g, '');
            for (const magicHandler of magicHandlers) {
                if (!magicHandler.isTarget(innerMagic)) {
                    continue;
                }
                html = html.replace(magic, magicHandler.expand(innerMagic, this.toWikiURI));
            }
        }
        return html;
    }

    public addMagicHandler(magicHandler: IMagicHandler): void {
        this.magicHandlers.push(magicHandler);
    }
}


interface IMagicHandler {
    // 中身がこのハンドラーが対象とする物であるかを判定
    isTarget(content: string): boolean;

    // 中身を展開
    expand(content: string, toWikiURI: ToWikiURI): string;
}


class FileHandler implements IMagicHandler {
    private fileHandlers: AbstractFileHandler[] = [];
    private notImplementedHandler: AbstractFileHandler = new NotImplementedFileHandler();

    public constructor(private readonly isFile: (path: string) => boolean) {
    }

    public addHandler(handler: AbstractFileHandler): void {
        this.fileHandlers.push(handler);
    }

    public isTarget(content: string): boolean {
        const path: string = content.split('|')[0];
        return this.isFile(path);
    }

    public expand(content: string, toWikiURI: ToWikiURI): string {
        const path: string = content.split('|')[0];
        for (const handler of this.fileHandlers) {
            if (handler.isTargetFile(path)) {
                return handler.expand(content, toWikiURI);
            }
        }
        return this.notImplementedHandler.expand(content, toWikiURI);
    }
}


type IsTargetWikiLink = (path: string) => boolean;
abstract class AbstractFileHandler {
    public constructor(private readonly isTargetPath: IsTargetWikiLink) {
    }

    public isTargetFile(path: string): boolean {
        return this.isTargetPath(path);
    }

    public expand(content: string, toWikiURI: ToWikiURI): string {
        const [path, ...options]: string[] = content.split('|');
        return this.createHTML(path, options, toWikiURI);
    }

    protected abstract createHTML(path: string, options: string[], toWikiURI: ToWikiURI): string;
}


class NotImplementedFileHandler extends AbstractFileHandler {
    public constructor() {
        super((path: string) => true);
    }

    public createHTML(path: string, options: string[], toWikiURI: ToWikiURI): string {
        return `ERROR(${path})`;
    }
}


class NotFoundFileHandler extends AbstractFileHandler {
    public constructor(notFound: IsTargetWikiLink) {
        super(notFound);
    }

    public createHTML(path: string, options: string[], toWikiURI: ToWikiURI): string {
        return `<a href="${toWikiURI(path)}">${path}</a>`;
    }
}


type ImageFormat = 'none'|'frameless'|'border'|'frame'|'thumb';
class ImageFileHandler extends AbstractFileHandler {
    public constructor(isImage: IsTargetWikiLink) {
        super(isImage);
    }

    public createHTML(path: string, options: string[], toWikiURI: ToWikiURI): string {
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
        const img: string = this.createImgTag(toWikiURI, path, alt, classNames, styleResults.props);

        let html: string = styleResults.openTag;
        if (styleResults.link === '') {
            html += img;
        } else if (styleResults.link === null) {
            html += `<a href="[:link:]" class="image">` + img + '</a>';
        } else {
            const href: string = toWikiURI(styleResults.link);
            html += `<a href="${href}">` + img + '</a>';
        }
        html += styleResults.closeTag;

        html = html.replace(/\[:caption:\]/g, replaceCaption);
        const LINK_PATTERN: RegExp = /\[:link:\]/g;
        if (styleResults.link !== null) {
            html = html.replace(LINK_PATTERN, styleResults.link);
        } else {
            html = html.replace(LINK_PATTERN, toWikiURI(path));
        }
       return html;
    }

    private createImgTag(toWikiURI: ToWikiURI, src: string, alt: string, classNames: string[], props: string[]): string {
        let img: string = `<img alt="${alt}" src="${toWikiURI(src)}" decoding="async"`;
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
                             '<a href="[:link:]" title="Enlarge"></a>' +
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
class PDFFileHandler extends AbstractFileHandler {
    private readonly defaultSize = {width: '100%', height: 'calc(100vh - 300px)'};

    public constructor(isPDF: IsTargetWikiLink) {
        super(isPDF);
    }

    protected createHTML(path: string, options: string[], toWikiURI: ToWikiURI): string {
        const {style, pdfFormat, remains} = this.styleOptions(options);
        const title: string = remains.length === 0 ? path : remains.slice(-1)[0];
        let html: string;

        switch (pdfFormat) {
            case 'preview':
                const data: string = toWikiURI(path);
                html = `<object style="${style}" type="application/pdf" data="${data}">` +
                         '<div class="alert alert-warning">' +
                           `<p>${path} could not be displayed. </p>` +
                         '</div>' +
                       '</object>';
                    break;
            case 'link':
                const href: string = toWikiURI(path);
                html = `<a href="${href}">${title}</a>`;
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


export {WikiMD, FileHandler, NotFoundFileHandler, ImageFileHandler, PDFFileHandler}
