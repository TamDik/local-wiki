abstract class AbstractCodeTable {
    private $wrapper: JQuery = $('<div class="code-table-wrapper">');
    private $codeTable: JQuery = $('<table class="code-table" class="w-100">');
    constructor(private readonly numOfLineNum: number) {
    }

    public appendTo($parent: JQuery): void {
        $parent.append(
            this.$wrapper.append(this.$codeTable)
        );
    }

    public show(): void {
        this.$wrapper.show();
    }

    public hide(): void {
        this.$wrapper.hide();
    }

    public update(): void {
        this.$codeTable.empty();
        this.create();
    }

    protected abstract create(): void;

    protected appendCodeRow(line: string, numbers: (number|null)[], classname: string='') {
        if (numbers.length !== this.numOfLineNum) {
            throw new Error(`numbers の数が一致しない. expected: ${this.numOfLineNum}, actual: ${numbers.length}`);
        }
        const $tr: JQuery = $('<tr>').addClass(classname);
        for (const num of numbers) {
            const $td: JQuery = $('<td class="code-line-number">').addClass(classname);
            if (typeof(num) === 'number') {
                $td.attr('data-line-number', num);
            }
            $tr.append($td);
        }
        const $code: JQuery = $('<td class="code-code-body">').html(line).addClass(classname);
        $tr.append($code);
        this.appendTableRow($tr);
    }

    protected appendTableRow($tableRow: JQuery): void {
        this.$codeTable.append($tableRow);
    }

    protected on(event: string, selector: string, handler: (event: JQueryEventObject, $codeTable: JQuery<Element>)=>void): void {
        this.$codeTable.on(event, selector, (event: JQueryEventObject) => {
            handler(event, this.$codeTable);
        });
    }
}

class ViewCodeTable extends AbstractCodeTable {
    private code: string = '';
    constructor() {
        super(1);
    }

    public setCode(code: string): void {
        this.code = code;
    }

    protected create(): void {
        const codeList: string[] = this.code.split('\n');
        for (const [index, line] of codeList.entries()) {
            this.appendCodeRow(line, [index + 1]);
        }
    }
}

type LineDiff = ['+'|'-'|'=', string] | ['r', string, string]
type Opcode = ['equal'|'insert'|'delete'|'replace', number, number, number, number];
class DiffParser {
    private beforeText: string|null = null;
    private afterText: string|null = null;

    public setBefor(text: string|null): void {
        this.beforeText = text;
    }

    public setAfter(text: string|null): void {
        this.afterText = text;
    }

    public getDiff(): LineDiff[] {
        let diffs: LineDiff[] = [];
        if (typeof(this.afterText) === 'string' && typeof(this.beforeText) === 'string') {
            const base: string[] = this.beforeText.split('\n');
            const newtxt: string[] = this.afterText.split('\n');
            const sm = new window.difflib.SequenceMatcher(base, newtxt);
            const opcodes: Opcode[] = sm.get_opcodes();
            diffs = this.opcodesToLineDiff(opcodes, base, newtxt);

        } else if (typeof(this.beforeText) === 'string') {
            diffs = this.beforeText.split('\n').map(line => ['-', line]);

        } else if (typeof(this.afterText) === 'string') {
            diffs = this.afterText.split('\n').map(line => ['+', line]);

        }
        return diffs;
    }


    private opcodesToLineDiff(opcodes: Opcode[], base: string[], newtxt: string[]): LineDiff[] {
        const lineDiffs: LineDiff[] = [];
        for (const opcode of opcodes) {
            const [opotype, baseMin, baseNext, newtxtMin, newtxtNext] = opcode;
            switch (opotype) {
                case 'equal':
                    for (let baseI = baseMin; baseI < baseNext; baseI++) {
                        lineDiffs.push(['=', base[baseI]]);
                    }
                    break;
                case 'insert':
                    for (let newtextI = newtxtMin; newtextI < newtxtNext; newtextI++) {
                        lineDiffs.push(['+', newtxt[newtextI]]);
                    }
                    break;

                case 'delete':
                    for (let baseI = baseMin; baseI < baseNext; baseI++) {
                        lineDiffs.push(['-', base[baseI]]);
                    }
                    break;

                case 'replace':
                    for (let baseI = baseMin; baseI < baseNext; baseI++) {
                        lineDiffs.push(['-', base[baseI]]);
                    }
                    for (let newtextI = newtxtMin; newtextI < newtxtNext; newtextI++) {
                        lineDiffs.push(['+', newtxt[newtextI]]);
                    }
                    break;
            }
        }
        return lineDiffs;
    }
}


class DiffCodeTable extends AbstractCodeTable {
    static LINE_TYPE_CLASS_NAME = {
        '+': 'addition',
        '-': 'deletion',
        '=': ''
    }
    private diffParser: DiffParser = new DiffParser();

    constructor() {
        super(2);
        this.on('click', '.expandable-line-num', (event, $codeTable: JQuery<Element>) => {
            const $tr: JQuery<Element> = $(event.currentTarget).parent();
            const expandClass: string = <string>$tr.attr('data-expand');
            $codeTable.find('.expanded-code.' + expandClass).removeClass('d-none');
            $tr.remove();
        })
    }

    public setCodeBeforeChange(code: string|null) {
        this.diffParser.setBefor(code);
    }

    public setCodeAfterChange(code: string|null) {
        this.diffParser.setAfter(code);
    }

    protected create(): void {
        let diffs: LineDiff[] = this.diffParser.getDiff();
        this.setTableRows(diffs);
    }

    private setTableRows(diffs: LineDiff[]): void {
        this.removeReplacement(diffs);
        const skipFlags: boolean[] = this.getSkipFlags(diffs, 3);

        let num1: number = 1;
        let num2: number = 1;
        const skipDiffs: LineDiff[] = [];
        for (let i = 0, len = diffs.length; i < len; i++) {
            const diff: LineDiff = diffs[i];
            const skip: boolean = skipFlags[i];
            if (skip) {
                skipDiffs.push(diff);
                continue;
            }
            if (skipDiffs.length !== 0) {
                [num1, num2] = this.appendSkipDiffs(skipDiffs, num1, num2);
                skipDiffs.length = 0;
            }
            [num1, num2] = this.appendDiff(diff, num1, num2);
        }

        if (skipDiffs.length !== 0) {
            this.appendSkipDiffs(skipDiffs, num1, num2);
        }
    }

    private removeReplacement(diffs: LineDiff[]): void {
        const diffsCopy: LineDiff[] = [...diffs];
        const replacements: ['+', string][] = [];
        diffs.length = 0;
        for (const diff of diffsCopy) {
            if (diff[0] === 'r') {
                replacements.push(['+', diff[2]]);
                diffs.push(['-', diff[1]]);
            } else {
                diffs.push(...replacements);
                diffs.push(diff);
                replacements.length = 0;
            }
        }
        diffs.push(...replacements);
    }

    private getSkipFlags(diffs: LineDiff[], margin: number): boolean[] {
        let skips: boolean[] = diffs.map(diff => diff[0] === '=');
        const diffLen: number = diffs.length;

        for (let marginI = 0; marginI < margin; marginI++) {
            const skipsTemp: boolean[] = [...skips];
            for (let skipI = 0; skipI < diffLen; skipI++) {
                skipsTemp[skipI] = skips[skipI];
                if (skipI !== 0) {
                    skipsTemp[skipI] = skipsTemp[skipI] && skips[skipI - 1];
                }
                if (skipI !== skips.length - 1) {
                    skipsTemp[skipI] = skipsTemp[skipI] && skips[skipI + 1];
                }
            }
            skips = [...skipsTemp];
        }
        return skips;
    }

    private appendSkipDiffs(skipDiffs: LineDiff[], num1: number, num2: number): [number, number] {
        const skipLen: number = skipDiffs.length;
        const expandClass: string = this.getExpandClass(num1, skipLen);
        this.appendExpandableTableRow(expandClass, skipLen);
        for (let i = 0; i < skipLen; i++) {
            const skipDiff: LineDiff = skipDiffs[i];
            [num1, num2] = this.appendExpandedTableRow(skipDiff, num1, num2, expandClass, i === 0, i === skipLen - 1);
        }
        return [num1, num2];
    }

    private getExpandClass(leftMin: number, len: number): string {
        return `${leftMin}-${leftMin + len}`
    }

    private appendExpandableTableRow(expandClass: string, len: number): void {
        const $tr: JQuery = $('<tr>').addClass('expandable').attr('data-expand', expandClass);
        const $td1: JQuery = $('<td class="expandable-line-num">').prop('colspan', 2);
        const $td2: JQuery = $('<td class="expandable-code">').html(len + ' line' + (len < 2 ? '' : 's'));
        $tr.append($td1, $td2);
        this.appendTableRow($tr);
    }

    private appendExpandedTableRow(diff: LineDiff, num1: number, num2: number, expandClass: string,
                                   isFirst: boolean, isLast: boolean): [number, number] {
        let tableRows: JQuery[];
        [tableRows, num1, num2] = this.diffToTableRows(diff, num1, num2);
        for (const $tableRow of tableRows) {
            $tableRow.addClass('d-none').addClass('expanded-code').addClass(expandClass);
        }
        if (isFirst) {
            tableRows[0].addClass('first');
        }
        if (isLast) {
            tableRows[tableRows.length - 1].addClass('last');
        }
        for (const $tr of tableRows) {
            this.appendTableRow($tr);
        }
        return [num1, num2]
    }

    private appendDiff(diff: LineDiff, num1: number, num2: number): [number, number] {
        let tableRows: JQuery[];
        [tableRows, num1, num2] = this.diffToTableRows(diff, num1, num2);
        for (const $tableRow of tableRows) {
            this.appendTableRow($tableRow);
        }
        return [num1, num2];
    }

    private diffToTableRows(diff: LineDiff, num1: number, num2: number): [JQuery[], number, number] {
        const lineType: '+'|'-'|'='|'r' = diff[0];
        const tableRows: JQuery[] = [];
        switch (lineType) {
            case '=':
                tableRows.push(this.getTableRow(diff[1], lineType, num1++, num2++));
                break;

            case '-':
                tableRows.push(this.getTableRow(diff[1], lineType, num1++, null));
                break;

            case '+':
                tableRows.push(this.getTableRow(diff[1], lineType, null, num2++));
                break;

            case 'r':
                tableRows.push(this.getTableRow(diff[1], '-', num1++, null));
                tableRows.push(this.getTableRow(<string>diff[2], '+', null, num2++));
                break;
        }
        return [tableRows, num1, num2];
    }

    private getTableRow(line: string, lineType: '+'|'-'|'=', num1: number|null, num2: number|null): JQuery {
        const classname = DiffCodeTable.LINE_TYPE_CLASS_NAME[lineType];
        const $tr: JQuery = $('<tr>').addClass(classname);
        const $td1: JQuery = $('<td class="code-line-number">').addClass(classname);
        const $td2: JQuery = $('<td class="code-line-number">').addClass(classname);
        const $code: JQuery = $('<td class="code-code-body">').html(line).addClass(classname);

        if (typeof(num1) === 'number') {
            $td1.attr('data-line-number', num1);
        }
        if (typeof(num2) === 'number') {
            $td2.attr('data-line-number', num2);
        }

        $tr.append($td1, $td2, $code);
        return $tr;
    }
}
