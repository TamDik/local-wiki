import hljs from 'highlight.js';


interface HTMLTagCreator {
    toHTML(): string;
}


class LinkTagCreator implements HTMLTagCreator {
    public constructor(private readonly href: string, private readonly title: string|null, private readonly text: string) {
    }

    public toHTML(): string {
        if (this.title === null) {
            return `<a href="${this.href}">${this.text}</a>`;
        }
        return `<a href="${this.href}" title="${this.title}">${this.text}</a>`;
    }
}


class ImageTagCreator implements HTMLTagCreator {
    private readonly params: {[key: string]: string|number|null};
    public constructor(src: string, readonly alt: string|null, readonly title: string|null, private readonly href?: string) {
        this.params = {src, alt, title, decoding: 'async', width: 300};
    }

    public toHTML(): string {
        const img: string = this.imgTag();
        if (!this.href) {
            return img;
        }
        return `<a href="${this.href}" class="image">${img}</a>`;
    }

    private imgTag(): string {
        let img: string = '<img';
        for (const key in this.params) {
            const value: string|number|null = this.params[key];
            if (value === null) {
                continue;
            }
            img += ` ${key}="${value}"`;
        }
        img += '>';
        return img;
    }
}


class MathTagCreator implements HTMLTagCreator {
    public constructor(private readonly code: string) {
    }

    public toHTML(): string {
        return `<p><math>${this.code}</math></p>`;
    }
}


class CodeTagCreator implements HTMLTagCreator {
    public constructor(private readonly code: string, private readonly infostring?: string) {
    }

    public toHTML(): string {
        let validLanguage: string;
        if (this.infostring) {
            validLanguage = hljs.getLanguage(this.infostring) ? this.infostring : 'plaintext';
        } else {
            validLanguage = 'plaintext';
        }
        const precode: string = '<pre><code>' + hljs.highlight(validLanguage, this.code).value + '</code></pre>';
        const copyButton: string = '<div class="copy-button">Copy</div>';
        return '<div class="code-wrapper">' + precode + copyButton + '</div>';
    }
}


export {HTMLTagCreator, LinkTagCreator, ImageTagCreator, MathTagCreator, CodeTagCreator};
