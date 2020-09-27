type DiffMode = 'diff' | 'view';

class HistoryList {
    private mode_: DiffMode = 'diff';
    private lastData_: HistoricalData|null = null;
    private readonly listItemMap: Map<string, HistoryListItem> = new Map();
    private readonly $ol: JQuery = $('<ol class="w-100 history">');
    private revertFunc: (historicalData: HistoricalData)=>void = () => {};

    constructor() {
        this.$ol.on('change', 'input[type="radio"]', event => {
            const $input: JQuery = $(event.currentTarget);
            this.$ol.find('input[name="' + $input.attr('name') + '"]').not($input).trigger('unchecked');
        });

        this.$ol.on('change', 'input[type="radio"][name="old"]', event => {
            const $li: JQuery = $(event.currentTarget).parent();
            $li.prevAll('.after').removeClass('after').addClass('between');
            $li.nextAll('.between').removeClass('between').addClass('after');
            $li.removeClass('between').addClass('after');
        });

        this.$ol.on('change', 'input[type="radio"][name="diff"]', event => {
            const $li = $(event.currentTarget).parent();
            $li.prevAll('.between').removeClass('between').addClass('before');
            $li.nextAll('.before').removeClass('before').addClass('between');
            $li.removeClass('between').addClass('before');
        });
    }

    public get lastHistoricalData(): HistoricalData|null {
        return this.lastData_;
    }

    public get old(): HistoricalData|null {
        return this.getCheckedData('old');
    }

    public get diff(): HistoricalData|null {
        return this.getCheckedData('diff');
    }

    public get view(): HistoricalData|null {
        return this.getCheckedData('view');
    }

    public appendTo($parent: JQuery): void {
        $parent.append($('<div class="history">').append(this.$ol));
    }

    public add(historicalData: HistoricalData): void {
        this.lastData_ = historicalData;

        const item: HistoryListItem = new HistoryListItem(this, historicalData);
        this.listItemMap.set(historicalData.id, item);
        this.$ol.append(item.$li);
        item.reverted(this.revertFunc);
    }

    // 他のラジオボタンがチェックされた時に発火するコールバックを登録する
    public checked(func: ()=>void): void {
        this.$ol.on('change', 'input[type="radio"]', event => {
            func();
        });
    }

    // revert ボタンがクリックされた時に発火するコールバックを登録する
    public reverted(func: (historicalData: HistoricalData)=>void): void {
        this.revertFunc = func;
    }

    public size(): number {
        return this.listItemMap.size;
    }

    public getMode(): DiffMode {
        return this.mode_;
    }

    public setMode(mode: DiffMode): void {
        this.mode_ = mode;
        for (const item of this.listItemMap.values()) {
            item.setMode();
        }
    }

    private getCheckedData(name: string): HistoricalData|null {
        const dataId = this.$ol.find(`input[type="radio"][name="${name}"]:checked`).val();
        if (typeof(dataId) !== 'string') {
            return null;
        }
        const historicalData: HistoricalData|null = this.getHistoricalData(dataId);
        if (historicalData === null) {
            return null;
        }
        return historicalData;
    }

    private getHistoricalData(dataId: string): HistoricalData|null {
        const item: HistoryListItem|undefined = this.listItemMap.get(dataId);
        if (item) {
            return item.historicalData;
        }
        return null;
    }
}

// HistoryList を通して操作し、外部から操作してはいけない。
class HistoryListItem {
    public readonly $li: JQuery;
    private readonly $viewRadio: JQuery;
    private readonly $oldRadio: JQuery;
    private readonly $diffRadio: JQuery;

    constructor(private historyList: HistoryList, public readonly historicalData: HistoricalData) {
        this.$viewRadio = $('<input type="radio" name="view">').val(historicalData.id);
        this.$oldRadio  = $('<input type="radio" name="old">').val(historicalData.id);
        this.$diffRadio = $('<input type="radio" name="diff">').val(historicalData.id);

        this.$li = this.createListItem();

        this.setRadioCheckedProp();
        this.setRadioAction();
        this.setMode();
    }

    public reverted(func: (historicalData: HistoricalData)=>void): void {
        this.$li.on('click', '.revert-button', event => {
            func(this.historicalData);
        });
    }

    public setMode(): void {
        this.$li.removeClass('selected');
        if (this.historyList.getMode() === 'diff') {
            this.$viewRadio.addClass('d-none');
            this.$oldRadio.removeClass('d-none');
            this.$diffRadio.removeClass('d-none');
            if (this.$oldRadio.prop('checked') || this.$diffRadio.prop('checked')) {
                this.$li.addClass('selected');
            }

        } else {
            this.$viewRadio.removeClass('d-none');
            this.$oldRadio.addClass('d-none');
            this.$diffRadio.addClass('d-none');
            if (this.$viewRadio.prop('checked')) {
                this.$li.addClass('selected');
            }
        }
    }

    private createListItem(): JQuery {
        const $li = $('<li>').append(this.$viewRadio, this.$oldRadio, this.$diffRadio, this.getBody());
        const comment: string = this.historicalData.comment;
        if (comment !== '') {
            const $icon: JQuery = $('<span class="comment-icon">').tooltip({placement: 'right', title: comment});
            $li.append($icon);
        }
        return $li;
    }

    private setRadioCheckedProp(): void {
        if (this.historyList.size() === 0) {
            this.$viewRadio.prop('checked', true);
            this.$diffRadio.prop('checked', true);
            this.$li.addClass('before');
        } else {
            this.$li.addClass('after');
        }

        if (this.historyList.size() === 1) {
            this.$oldRadio.prop('checked', true);
        }
    }

    private setRadioAction(): void {
        this.$li.on('change', 'input[type="radio"]', event => {
            this.$li.addClass('selected');
        });

        this.$li.on('unchecked', 'input[type="radio"]', event => {
            if (this.historyList.getMode() === 'diff') {
                if (this.$oldRadio.prop('checked') || this.$diffRadio.prop('checked')) {
                    return;
                }
            }
            this.$li.removeClass('selected');
        });
    }

    private getBody(): string {
        let body: string = this.date2str(this.historicalData.updated);
        if (this.historicalData.next === null) {
            body += ' (current)';
        } else {
            /* body += ' (<a href="#" class="revert-button">revert</a>)' */
        }
        return body;
    }

    private zeroPadding(num: number, digits: number): string {
        return (Array(digits).join('0') + num).slice(-digits);
    }

    private date2str(date: Date): string {
        let formattedStr: string = '';
        formattedStr += this.zeroPadding(date.getFullYear(), 4) + '/';
        formattedStr += this.zeroPadding(date.getMonth() + 1, 2) + '/';
        formattedStr += this.zeroPadding(date.getDate(), 2) + ' ';
        formattedStr += this.zeroPadding(date.getHours(), 2) + ':';
        formattedStr += this.zeroPadding(date.getMinutes(), 2) + ':';
        formattedStr += this.zeroPadding(date.getSeconds(), 2);
        return formattedStr;
    }
}
