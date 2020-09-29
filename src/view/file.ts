function dispatchWikiActionFile(controller: WikiController, wikiNS: string, wikiName: string, wikiAction: WikiAction): IContentView {
    if (wikiAction === 'history') {
        return new FileHistoryView(controller.$mainContentWrapper, wikiNS, wikiName);
    }
    return new FileView(controller.$mainContentWrapper, wikiNS, wikiName);
}


class FileView implements IContentView {
    public constructor(private $parent: JQuery, private wikiNS: string, private wikiName: string) {
    }

    public update(): void {
        this.$parent.append(`<h1>${this.wikiNS}:File:${this.wikiName}</h1>`);

        IpcAdapter.getHistoricalFileData(this.wikiNS, this.wikiName, 1, 0)
        .then(data => {
            if (data.length === 1) {
                this.updateAsReadView(data[0]);
            } else {
                this.updateAsNotFoundView();
            }
        });
    }

    private updateAsReadView(data: HistoricalFileData): void {
        const {filepath, filetype} = data;
        const uploadHref: string = `${this.wikiNS}:Special:UploadFile?wikiname=${this.wikiName}`;
        const $main: JQuery = $('<div class="row">').append(
            $('<div class="col-12">').append(
                this.createMainView(filepath, filetype)
            ),
            $('<div class="col-12">').append(
                '<h2>history</h2>',
                $('<table class="w-100">').append(
                    this.createTableHead(),
                    this.createTableBody(filepath)
                )
            ),
            $('<div class="col-12 pb-4">').append(
                `<a href="${uploadHref}" class="internal-link">Upload a new version of this file</a>`
            )

        );

        this.$parent.append($main);
        this.setEvent();
    }

    private setEvent(): void {
        this.$parent.on('click', '.pdf-preview', event => {
            const pdfUrl: string = <string>$(event.currentTarget).attr('data-pdf-url');
        });
    }

    private createMainView(filepath: string, filetype: FileType): string {
        switch (filetype) {
            case 'image':
                return `<img src="${filepath}" alt="${this.wikiName}" decoding="async">`;
            case 'pdf':
                return this.createPDFMainView(filepath);
            case 'page':
            case 'other':
                return filepath;
        }
    }

    private createPDFMainView(filepath: string): string {
        const lines: string[] = [];
        lines.push('<div class="row"><div class="col-12 px-5">');
        lines.push(`<object class="w-100" style="height: calc(100vh - 300px);" type="application/pdf" data="${filepath}">`);
        lines.push('<div class="alert alert-warning">');
        lines.push('<p>The corresponding file could not be displayed. </p>');
        lines.push('</div>');
        lines.push('</object>');
        lines.push('</div></div>');
        return lines.join('');
    }

    private createTableHead(): string {
        const lines: string[] = [];
        lines.push('<thead>');
        lines.push('<tr>');
        lines.push('<th></th>');
        lines.push('<th>Date/Time</th>');
        lines.push('<th>Thumbnail</th>');
        lines.push('<th>Size</th>');
        lines.push('<th>Comment</th>');
        lines.push('</tr>');
        lines.push('</thead>');
        return lines.join('');
    }

    private createTableBody(latestFilepath: string): JQuery {
        const $tableBody: JQuery = $('<tbody>');
        IpcAdapter.getHistoricalFileData(this.wikiNS, this.wikiName, 30, 0)
        .then(dataList => {
            let isCurrent: boolean = true;
            for (const data of dataList) {
                $tableBody.append(this.createTableRow(data, isCurrent));
                isCurrent = false;
            }
        });
        return $tableBody;
    }

    private createTableRow(data: HistoricalFileData, isCurrent: boolean): JQuery {
        const $tableRow: JQuery = $('<tr>');
        const thumbnail: string = this.createThumbnail(data);
        $tableRow.append(
            isCurrent ? '<td>current</td>' : '<td>revert</td>',
            `<td>${date2str(data.updated)}</td>`,
            `<td>${thumbnail}</td>`,
            `<td>${bytes2str(data.filesize)}</td>`,
            `<td>${data.comment}</td>`
        );
        return $tableRow;
    }

    private createThumbnail(data: HistoricalFileData): string {
        const {filepath, filetype} = data;
        switch (filetype) {
            case 'image':
                return `<img src="${filepath}" alt="${this.wikiName}" decoding="async" style="max-width: 120px;">`;
            case 'pdf':
                return `<button class="btn btn-outline-secondary btn-sm pdf-preview" data-pdf-url="${filepath}">preview</button>`
            case 'page':
            case 'other':
                return filetype;
        }
    }

    private updateAsNotFoundView(): void {
        const lines: string[] = [];
        const href: string = `${this.wikiNS}:Special:UploadFile?wikiname=${this.wikiName}`;
        lines.push(`<p>No file by this name exists, but you can <a href=${href} class="internal-link">upload it</a>.</p>`);
        this.$parent.append(lines.join(''));
    }
}


class FileHistoryView implements IContentView {
    private readonly numOfParSession: number = 30;
    private lastData: HistoricalData | null = null;
    private readonly $nextButton: JQuery;
    private readonly $historyList: JQuery;

    public constructor(private $parent: JQuery, private wikiNS: string, private wikiName: string) {
        this.$nextButton = $('<button type="button" class="btn btn-outline-primary btn-block">').html('next historical data');
        this.$historyList = $('<ol class="w-100">');
    }

    public update(): void {
        this.$parent.append($('<div class="history">').append(this.$historyList, this.$nextButton));
        this.updateHistoryList(0);
        this.$nextButton.on('click', event => {
            if (this.lastData === null || this.lastData.prev === null) {
                return;
            }
            this.updateHistoryList(this.lastData.version - 1);
        });
    }

    private async updateHistoryList(maxVersion: number): Promise<void> {
        const params: [string, string, number, number] = [this.wikiNS, this.wikiName, this.numOfParSession, maxVersion];
        const dataList: HistoricalData[] = await IpcAdapter.getHistoricalFileData(...params);
        for (const data of dataList) {
            this.addHistoryListItem(data);
            this.lastData = data;
        }
        console.log(this.lastData);
        if (this.lastData === null || this.lastData.prev === null) {
            this.$nextButton.prop('disabled', true)
        }
    }

    private addHistoryListItem(data: HistoricalData): void {
        const {comment} = data;
        const $li: JQuery = $('<li>').append(this.getBody(data));
        if (comment !== '') {
            const $icon: JQuery = $('<span class="comment-icon">').tooltip({placement: 'right', title: comment});
            $li.append($icon);
        }
        this.$historyList.append($li);
    }

    private getBody(data: HistoricalData): string {
        const {updated, comment, filepath} = data;
        let body: string = date2str(updated);
        if (data.next === null) {
            body += ' (current)';
        } else {
            /* body += ' (<a href="#" class="revert-button">revert</a>)' */
        }
        return body;
    }
}
