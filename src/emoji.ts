import * as fs from 'fs';
import * as path from 'path';
import {APP_DIR} from './data-dir';

const DIST_IMAGE_DIR: string = path.join(APP_DIR, 'dist/images')
const DIST_JS_DIR: string = path.join(APP_DIR, 'dist/js')


type EmojiSet = 'apple' | 'facebook' | 'google' | 'twitter';

type Emoji = {
    name: string,
    unified: string,
    sheet_x: number,
    sheet_y: number,
    short_name: string,
    short_names: string[],
    category: string,
    subcategory: string,
    sort_order: number
};

class EmojiReplacer {
    private readonly PATTERN: RegExp = /:[^:\s]+:/g
    private readonly emojiData: Emoji[];

    public constructor(private emojiSet: EmojiSet) {
        const jsonPath: string = path.join(DIST_JS_DIR, 'emoji.json');
        this.emojiData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }

    public replace(text: string): string {
        const matches: RegExpMatchArray|null = text.match(this.PATTERN);
        if (!matches) {
            return text;
        }
        for (const match of matches) {
            const content: string = match.slice(1, -1);
            const emoji: Emoji|null = this.searchEmoji(content);
            if (emoji === null) {
                continue;
            }
            text = text.replace(match, this.emojiImg(emoji));
        }
        return text;
    }

    private searchEmoji(content: string): Emoji|null {
        const SPACE_PATTERN: RegExp = /[-\s]/g;
        const unified: string = content.replace(SPACE_PATTERN, '_');
        for (const emoji of this.emojiData) {
            for (const short_name of emoji.short_names) {
                if (short_name.replace(SPACE_PATTERN, '_') === unified) {
                    return emoji;
                }
            }
        }
        return null;
    }

    private emojiImg(emoji: Emoji): string {
        const alt: string = emoji.name;
        const em: number = 1.2;
        const url: string = path.join(DIST_IMAGE_DIR, `emoji/sheet_${this.emojiSet}_64.png`);
        let style: string = 'display: inline-block;'
        style += `width: ${em}em; height: ${em}em;`
        style += `background-image: url(${url});`
        style += `background-size: ${em * 60}em;`
        style += `background-position: -${emoji.sheet_x * em}em -${emoji.sheet_y * em}em;`;
        style += `vertical-align: middle;`;
        return `<span style="${style}"></span>`
    }
}

export {EmojiReplacer};
