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

        IpcAdapter.getFilepath(this.wikiNS, this.wikiName)
        .then(filepath => {
            if (typeof(filepath) === 'string') {
                this.updateAsReadView(filepath);
            } else {
                this.updateAsNotFoundView();
            }
        });
    }

    private updateAsReadView(filepath: string): void {
        const uploadHref: string = `${this.wikiNS}:Special:UploadFile?wikiname=${this.wikiName}`;
        const $main: JQuery = $('<div class="row">').append(
            $('<div class="col-12">').append(
                this.createMainView(filepath)
            ),
            $('<div class="col-12">').append(
                '<h2>history</h2>',
                $('<table>').append(
                    $('<thead>').append($('<tr>').append(
                        '<th></th>',
                        '<th>Date/Time</th>',
                        '<th>Thumbnail</th>',
                        '<th>Size</th>',
                        '<th>Comment</th>',
                    )),
                    this.createTableBody(filepath)
                )
            ),
            $('<div class="col-12 pb-4">').append(
                `<a href="${uploadHref}" class="internal-link">Upload a new version of this file</a>`
            )

        );

        this.$parent.append($main);
    }

    // TODO FileType による切り替え
    private createMainView(filepath: string): string {
        return `<img src="${filepath}" alt="${this.wikiName}" decoding="async">`;
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
            `<td>${this.date2str(data.updated)}</td>`,
            `<td>${thumbnail}</td>`,
            `<td>${data.filesize}</td>`,
            `<td>${data.comment}</td>`
        );
        return $tableRow;
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

    // TODO image 以外の時のプレビュー
    private createThumbnail(data: HistoricalFileData): string {
        const filetype: FileType = data.filetype;
        if (filetype === 'image') {
            return `<img src="${data.filepath}" alt="${this.wikiName}" decoding="async" style="max-width: 120px;">`;
        }
        return filetype;
    }

    private updateAsNotFoundView(): void {
        const lines: string[] = [];
        const href: string = `${this.wikiNS}:Special:UploadFile?wikiname=${this.wikiName}`;
        lines.push(`<p>No file by this name exists, but you can <a href=${href} class="internal-link">upload it</a>.</p>`);
        this.$parent.append(lines.join(''));
    }
}

class FileHistoryView implements IContentView {
    public constructor(private $parent: JQuery, private wikiNS: string, private wikiName: string) {
    }

    public update(): void {
        this.$parent.append('file history');
    }
}
