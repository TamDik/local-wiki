abstract class AbstractCodeTable {
    private table: HTMLTableElement = document.createElement('table');

    public constructor(protected readonly element: HTMLElement, private readonly numOfLineNum: number) {
    }

    public update(): void {
        this.element.innerHTML = '';
        const div: HTMLDivElement = document.createElement('div');
        this.element.appendChild(div);
        div.appendChild(this.table);
        this.table.classList.add('code-table');
        div.classList.add('code-table-wrapper');
        this.create();
    }

    protected abstract create(): void;

    protected appendCodeRow(line: string, numbers: (number|null)[]|number|string|null, className: {tr?: string[], codeTd?: string[], numTds?: string[][]}) {
        const tr: HTMLTableRowElement = document.createElement('tr');
        this.table.appendChild(tr);
        const numTds: HTMLTableDataCellElement[] = this.addNumTds(tr, numbers);
        const codeTd: HTMLTableDataCellElement = document.createElement('td');
        tr.appendChild(codeTd);
        codeTd.innerText = line;
        if (numbers === null) {
            codeTd.colSpan = this.numOfLineNum + 1;
        }
        numTds.push(codeTd);
        this.addClassName(tr, codeTd, numTds, className);
    }

    private addNumTds(tr: HTMLTableRowElement, numbers: (number|null)[]|number|string|null): HTMLTableDataCellElement[] {
        if (numbers === null) {
            return [];
        }

        if (typeof(numbers) === 'number') {
            const td: HTMLTableDataCellElement = document.createElement('td');
            tr.appendChild(td);
            td.colSpan = this.numOfLineNum;
            td.dataset.lineNumber = String(numbers);
            return [td];
        }

        if (typeof(numbers) === 'string') {
            const td: HTMLTableDataCellElement = document.createElement('td');
            tr.appendChild(td);
            td.colSpan = this.numOfLineNum;
            td.innerText = String(numbers);
            return [td];
        }

        const numTds: HTMLTableDataCellElement[] = [];
        for (const num of numbers) {
            const td: HTMLTableDataCellElement = document.createElement('td');
            tr.appendChild(td);
            if (typeof(num) === 'number') {
                td.dataset.lineNumber = String(num);
            }
            numTds.push(td);
        }
        return numTds;
    }

    private addClassName(tr: HTMLElement, codeTd: HTMLElement, numTds: HTMLElement[], className: {tr?: string[], codeTd?: string[], numTds?: string[][]}): void {
        codeTd.classList.add('code-body');
        if (!className) {
            return;
        }
        if (className.tr && className.tr.length !== 0) {
            tr.classList.add(...className.tr);
        }

        if (className.codeTd && className.codeTd.length !== 0) {
            codeTd.classList.add(...className.codeTd);
        }

        if (className.numTds) {
            const len: number = className.numTds.length;
            for (let i = 0; i < len; i++) {
                if (className.numTds[i].length !== 0) {
                    const numTd: HTMLElement = numTds[i];
                    numTd.classList.add(...className.numTds[i]);
                }
            }
        }
    }
}


type LineDiff = ['+'|'-'|'=', string] | ['r', string, string]


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
            const sm = new difflib.SequenceMatcher(base, newtxt);
            const opcodes: difflib.Opcode[] = sm.get_opcodes();
            diffs = this.opcodesToLineDiff(opcodes, base, newtxt);

        } else if (typeof(this.beforeText) === 'string') {
            diffs = this.beforeText.split('\n').map(line => ['-', line]);

        } else if (typeof(this.afterText) === 'string') {
            diffs = this.afterText.split('\n').map(line => ['+', line]);

        }
        return diffs;
    }


    private opcodesToLineDiff(opcodes: difflib.Opcode[], base: string[], newtxt: string[]): LineDiff[] {
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
    private diffParser: DiffParser;

    public constructor(element: HTMLElement) {
        super(element, 2);
        this.diffParser = new DiffParser();
    }

    public setBeforeCode(code: string|null) {
        this.diffParser.setBefor(code);
    }

    public setAfterCode(code: string|null) {
        this.diffParser.setAfter(code);
    }

    protected create(): void {
        this.createTable();
        this.addEvents();
    }

    private createTable(): void {
        let diffs: LineDiff[] = this.diffParser.getDiff();
        diffs = this.withoutReplacement(diffs);

        let num1: number = 1;
        let num2: number = 1;
        let tableRows: HTMLTableRowElement[];
        const skips: boolean[] = this.needLinesSkip(diffs, 3);
        let skipping: LineDiff[] = [];
        for (let i = 0, len = diffs.length; i < len; i++) {
            const diff: LineDiff = diffs[i];
            const skip: boolean = skips[i];
            if (skip) {
                skipping.push(diff);
            } else {
                [num1, num2] = this.appendExpandableTableRows(skipping, num1, num2);
                skipping = [];
                [num1, num2] = this.appendCodeRows(diff, num1, num2);
            }
        }
        [num1, num2] = this.appendExpandableTableRows(skipping, num1, num2);
    }

    private needLinesSkip(diffs: LineDiff[], margin: number): boolean[] {
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

    private appendExpandableTableRows(skippingDiffs: LineDiff[], num1: number, num2: number): [number, number] {
        if (skippingDiffs.length === 0) {
            return [num1, num2];
        }
        const midPoint: number = skippingDiffs.length / 2;
        for (let i = 0, len = skippingDiffs.length; i < len; i++) {
            if (i >= midPoint && i < midPoint + 1) {
                this.appendExpandableTableRow(skippingDiffs.length);
            }
            const boundary = {first: i === 0, last: i === len - 1};
            this.appendSkipedCodeRow(skippingDiffs[i], num1++, num2++, boundary);
        }
        return [num1, num2];
    }

    private appendExpandableTableRow(numOfSkip: number): void {
        const className = {
            tr: ['expandable'],
            numTds: [['expand-button']],
            codeTd: ['expandable-code']
        };
        this.appendCodeRow(`${numOfSkip} lines`, '', className);
    }

    private appendSkipedCodeRow(diff: LineDiff, num1: number, num2: number, boundary: {first: boolean, last: boolean}): void {
        const className = {
            tr: ['d-none'],
            numTds: [['code-line-number'], ['code-line-number']],
            codeTd: ['code-code-body']
        };
        if (boundary) {
            if (boundary.first) {
                className.tr.push('first');
            }
            if (boundary.last) {
                className.tr.push('last');
            }
        }
        this.appendCodeRow(diff[1], [num1++, num2++], className);
    }

    private appendCodeRows(diff: LineDiff, num1: number, num2: number): [number, number] {
        const lineType: '+'|'-'|'='|'r' = diff[0];
        const tableRows: HTMLTableRowElement[] = [];
        const className = {numTds: [['code-line-number'], ['code-line-number']], codeTd: ['code-code-body']};
        const addition: string = 'addition';
        const deletion: string = 'deletion';
        switch (lineType) {
            case '=':
                this.appendCodeRow(diff[1], [num1++, num2++], className);
                break;

            case '-':
                this.appendCodeRow(diff[1], [num1++, null], {...className, tr: [deletion]});
                break;

            case '+':
                this.appendCodeRow(diff[1], [null, num2++], {...className, tr: [addition]});
                break;

            case 'r':
                this.appendCodeRow(diff[1], [num1++, null], {...className, tr: [deletion]});
                this.appendCodeRow(diff[2] as string, [null, num2++], {...className, tr: [addition]});
                break;
        }
        return [num1, num2];
    }

    private withoutReplacement(diffs: LineDiff[]): LineDiff[] {
        const result: LineDiff[] = [];
        let skiped: ['+', string][] = [];
        for (const diff of diffs) {
            if (diff[0] === 'r') {
                skiped.push(['+', diff[2]]);
                result.push(['-', diff[1]]);
            } else {
                result.push(...skiped);
                result.push(diff);
                skiped = [];
            }
        }
        result.push(...skiped);
        return result;
    }

    private addEvents(): void {
        const expandButtons: NodeListOf<HTMLTableDataCellElement> = this.element.querySelectorAll('.expand-button') as NodeListOf<HTMLTableDataCellElement>;
        const expandStep: number = 10;
        function hasExpanded(tr: HTMLTableRowElement): boolean {
            return !tr.classList.contains('d-none');
        }

        for (const button of expandButtons) {
            button.addEventListener('click', () => {
                const tr: HTMLTableRowElement = button.parentElement as HTMLTableRowElement;

                // firstTr
                let firstTr: HTMLTableRowElement = tr;
                while (true) {
                    const tempTr: HTMLTableRowElement|null = firstTr.previousElementSibling as HTMLTableRowElement;
                    if (!tempTr || hasExpanded(tempTr)) {
                        break;
                    }
                    firstTr = tempTr;
                }

                // lastTr
                let lastTr: HTMLTableRowElement = tr;
                while (true) {
                    const tempTr: HTMLTableRowElement|null = lastTr.nextElementSibling as HTMLTableRowElement;
                    if (!tempTr || hasExpanded(tempTr)) {
                        break;
                    }
                    lastTr = tempTr;
                }

                // expand
                for (let i = 0; i < expandStep; i++) {
                    firstTr.classList.remove('d-none');
                    firstTr.classList.add('expanded-line');
                    if (!firstTr.nextElementSibling) {
                        break;
                    }
                    firstTr = firstTr.nextElementSibling as HTMLTableRowElement;
                    if (hasExpanded(firstTr)) {
                        break;
                    }
                }
                for (let i = 0; i < expandStep; i++) {
                    lastTr.classList.remove('d-none');
                    lastTr.classList.add('expanded-line');
                    if (!lastTr.previousElementSibling) {
                        break;
                    }
                    lastTr = lastTr.previousElementSibling as HTMLTableRowElement;
                    if (hasExpanded(lastTr)) {
                        break;
                    }
                }

                // update expand button
                if (hasExpanded(firstTr) && hasExpanded(lastTr)) {
                    tr.remove();
                    return;
                }
                const firstTrNum: string = (firstTr.firstElementChild as HTMLElement).dataset.lineNumber as string;
                const lastTrNum: string = (lastTr.firstElementChild as HTMLElement).dataset.lineNumber as string;
                (tr.lastElementChild as HTMLElement).innerText = String(Number(lastTrNum) - Number(firstTrNum) + 1) + ' lines';

            }, false);
        }
    }
}
