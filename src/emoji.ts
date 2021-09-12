import * as fs from 'fs';
import * as path from 'path';
import {APP_DIR} from './data-dir';


abstract class EmojiList {
    private readonly SPACE_PATTERN: RegExp = /[-\s]/g;

    public abstract html(name: string): string|null;
    public abstract exists(name: string): boolean;
    public abstract like(name: string): Set<string>;

    protected unify(name: string): string {
        return name.replace(this.SPACE_PATTERN, '_').toLowerCase();
    }
}


class MergedEmojiList extends EmojiList {
    private emojiLists: EmojiList[] = [];

    public add(emojiList: EmojiList): void {
        this.emojiLists.push(emojiList);
    }

    public html(name: string): string|null {
        for (const emojiList of this.emojiLists) {
            const img: string|null = emojiList.html(name);
            if (typeof(img) === 'string') {
                return img;
            }
        }
        return null;
    }

    public exists(name: string): boolean {
        for (const emojiList of this.emojiLists) {
            if (emojiList.exists(name)) {
                return true;
            }
        }
        return false;
    }

    public like(name: string): Set<string> {
        let names: Set<string> = new Set();
        for (const emojiList of this.emojiLists) {
            names = new Set(emojiList.like(name));
        }
        return names;
    }
}


abstract class SpriteEmojiList extends EmojiList {
    public constructor(private spriteURL: string, private spriteWidth: number) {
        super();
    }

    public html(name: string): string|null {
        const xy = this.nameToXY(name)
        if (xy === null) {
            return null;
        }
        return this.emojiImgAt(xy);
    }

    private emojiImgAt(xy: {x: number, y: number}): string {
        const em: number = 1.0;
        let style: string = 'display: inline-block;'
        style += `width: ${em}em; height: ${em}em;`
        style += `background-image: url(${this.spriteURL});`
        style += `background-size: ${em * this.spriteWidth}em;`
        style += `background-position: -${xy.x * em}em -${xy.y * em}em;`;
        style += `vertical-align: middle;`;
        return `<span style="${style}"></span>`;
    }

    public exists(name: string): boolean {
        return this.nameToXY(name) !== null;
    }

    protected abstract nameToXY(name: string): {x: number, y: number}|null;

    public abstract like(name: string): Set<string>;
}


const DIST_IMAGE_DIR: string = path.join(APP_DIR, 'dist/images')
const DIST_JS_DIR: string = path.join(APP_DIR, 'dist/js')
type EmojiSet = 'apple' | 'facebook' | 'google' | 'twitter';
type DefaultEmoji = {
    name: string,
    unified: string,
    sheet_x: number,
    sheet_y: number,
    short_name: string,
    short_names: string[],
    category: string,
    subcategory: string,
    sort_order: number,
    skin_variations: {[key: string]: {
        unified: string,
        sheet_x: number,
        sheet_y: number
    }},
};


class DefaultEmojiList extends SpriteEmojiList {
    private readonly emojiData: DefaultEmoji[];

    public constructor(emojiSet: EmojiSet) {
        super(path.join(DIST_IMAGE_DIR, `emoji/sheet_${emojiSet}_64.png`), 60);
        const jsonPath: string = path.join(DIST_JS_DIR, 'emoji.json');
        this.emojiData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }

    protected nameToXY(name: string): {x: number, y: number}|null {
        const unified: string = this.unify(name);
        for (const emoji of this.emojiData) {
            for (const short_name of emoji.short_names) {
                if (this.unify(short_name) === unified) {
                    return {x: emoji.sheet_x, y: emoji.sheet_y};
                }
            }
        }
        return null;
    }

    public like(name: string): Set<string> {
        const names: Set<string> = new Set();
        const unified: string = this.unify(name);
        for (const emoji of this.emojiData) {
            for (const short_name of emoji.short_names) {
                if (this.unify(short_name).includes(unified)) {
                    names.add(short_name);
                    break;
                }
            }
        }
        return names;
    }
}


class EmojiReplacer {
    public readonly emojiList: EmojiList;

    public constructor(private emojiSet: EmojiSet) {
        const jsonPath: string = path.join(DIST_JS_DIR, 'emoji.json');
        const emojiList: MergedEmojiList = new MergedEmojiList();
        emojiList.add(new DefaultEmojiList(emojiSet));
        this.emojiList = emojiList;
    }

    public replace(text: string): string {
        const PATTERN: RegExp = /:[^:\s]+:/g
        const matches: RegExpMatchArray|null = text.match(PATTERN);
        if (!matches) {
            return text;
        }
        for (const match of matches) {
            const name: string = match.slice(1, -1);
            const img: string|null = this.emojiList.html(name);
            if (img) {
                text = text.replace(match, img);
            }
        }
        return text;
    }
}

export {EmojiReplacer};
