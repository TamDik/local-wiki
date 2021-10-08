import * as path from 'path';


class PageTransition {
    private history: string[];
    private index: number;

    public constructor() {
        this.history = [];
        this.index = this.history.length - 1
    }

    public canGoBack(): boolean {
        return this.index > 0;
    }

    public canGoForward(): boolean {
        return this.index < this.history.length - 1;
    }

    private isHistoricalTransition(path: string): boolean {
        const check_path: boolean = path === this.history[this.index];
        const check_index: boolean = this.index !== this.history.length - 1;
        return check_path && check_index;
    }

    private isTargetPath(path: string): boolean {
        const url: URL = new URL(path);
        const params: URLSearchParams = url.searchParams;
        const mode: string|null = params.get('mode');
        return mode == 'edit';
    }

    public goTo(path: string): string {
        // go back/forwardによる遷移であれば変更しない
        if (this.isHistoricalTransition(path)) {
            return path;
        }

        // 前回のパスが履歴管理の対象外ならば削除する
        if (this.history.length !== 0 && this.isTargetPath(this.history[this.index])) {
            this.history = this.history.slice(0, this.index);
        } else {
            this.history = this.history.slice(0, this.index + 1);
        }

        // 前回と異なるパスであるときに限って追加する
        if (this.history[this.history.length - 1] !== path) {
            this.history.push(path);
        }

        this.index = this.history.length - 1;
        return path;
    }

    public goBack(): string|null {
        if (!this.canGoBack()) {
            return null;
        }
        return this.history[--this.index];
    }

    public goForward(): string|null {
        if (!this.canGoForward()) {
            return null;
        }
        return this.history[++this.index];
    }
}


export {PageTransition};
