import {WikiType} from '../model/wiki_location';
import {Wiki, EditableTextContent, EditableFileContent} from '../model/wiki';

class ViewManager {
    public constructor(private readonly wiki: Wiki) {
    }

    /*
    public hasView(wikiNS: string, wikiType: WikiType, wikiName: string): boolean {
        switch (wikiType) {
            case 'Main':
                return this.wiki.hasPage(wikiNS, wikiName);
            case 'File':
                return this.wiki.hasFile(wikiNS, wikiName);
            case 'Template':
                return this.wiki.hasTemplate(wikiNS, wikiName);
            case 'Special':
                return false;
        }
    }
   */

    /*
    public getView(wikiNS: string, wikiType: WikiType, WikiName: string): View {
        switch (wikiType) {
            case 'Main':
                return new MainView(wikiNS, WikiName);
            case 'File':
                return new FileView(wikiNS, WikiName);
            case 'Template':
                return new TemplateView(wikiNS, WikiName);
            case 'Special':
                return new SpecialView(wikiNS, WikiName);
        }
    }
    */
}


type WikiAction = 'view' | 'edit' | 'history' | 'revert' | 'raw'; /* 'delete' */
abstract class View {
    public constructor(public readonly wikiNS: string,
                       public readonly wikiName: string,
                       public wikiAction: WikiAction) {
    }

    public getText(): string {
        switch (this.wikiAction) {
            case 'view':
                return this.getViewText();
            case 'edit':
                return this.getEditText();
            case 'history':
                return this.getHistoryText();
            case 'revert':
                return this.getRevertText();
            case 'raw':
                return this.getRawText();
        }
    }

    public postRender(): number {
        switch (this.wikiAction) {
            case 'view':
                return this.postViewRender();
            case 'edit':
                return this.postEditRender();
            case 'history':
                return this.postHistoryRender();
            case 'revert':
                return this.postRevertRender();
            case 'raw':
                return this.postRawRender();
        }
    }

    protected abstract getViewText(): string;

    protected getEditText(): string {
        return this.getViewText();
    }

    protected getHistoryText(): string {
        return this.getViewText();
    }

    // version
    protected getRevertText(): string {
        return this.getViewText();
    }

    // スペシャルページ
    protected getRawText(): string {
        return this.getViewText();
    }


    protected postViewRender(): number {
        return 1;
    }

    protected postEditRender(): number {
        return 1;
    }

    protected postHistoryRender(): number {
        return 1;
    }

    protected postRevertRender(): number {
        return 1;
    }

    protected postRawRender(): number {
        return 1;
    }
}

// 編集可能なページ
abstract class EditableView extends View {
    protected abstract getEditText(): string;
}

// （Template・File の展開も含む）
class MainView extends EditableView {
    private textContent: EditableTextContent;
    public constructor(wiki: Wiki, wikiNS: string, wikiName: string, wikiAction: WikiAction) {
        super(wikiNS, wikiName, wikiAction);
        this.textContent = wiki.getPage(wikiNS, wikiName, 0);
    }

    protected getViewText(): string {
        // パースして埋め込み
        return '';
    }

    protected getEditText(): string {
        this.textContent.content;
        return '';
    }

    protected getRawText(): string {
        return this.textContent.content;
    }

    protected postViewRender(): number {
        // TOC
        // リンク
        return 1;
    }
}

/*
// Template の編集画面とか
class TemplateView extends EditableView {
}


// ファイルの一覧画面とか
class FileView extends EditableView {
}


class SpecialView extends View {
}
*/
