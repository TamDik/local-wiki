abstract class AbstractCodeTable {
    private table: HTMLTableElement = document.createElement('table');

    public constructor(private readonly element: HTMLElement, private readonly numOfLineNum: number) {
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

    protected appendCodeRow(line: string, numbers: (number|null)[], className: {tr?: string[], codeTd?: string[], numTds?: string[][]}) {
        if (numbers.length !== this.numOfLineNum) {
            throw new Error(`the size of 'numbers' is invalid. expected: ${this.numOfLineNum}, actual: ${numbers.length}`);
        }
        const tr: HTMLTableRowElement = document.createElement('tr');
        this.table.appendChild(tr);

        const numTds: HTMLTableDataCellElement[] = [];
        for (const num of numbers) {
            const td: HTMLTableDataCellElement = document.createElement('td');
            tr.appendChild(td);
            if (typeof(num) === 'number') {
                td.dataset.lineNumber = String(num);
            }
            numTds.push(td);
        }

        const codeTd: HTMLTableDataCellElement = document.createElement('td');
        codeTd.innerText = line;
        numTds.push(codeTd);

        tr.appendChild(codeTd);

        this.addClassName(tr, codeTd, numTds, className);
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
            if (len > numTds.length - 1) {
                throw new Error(`the size of 'className.numTds' is invalid. expected: ${this.numOfLineNum}, actual: ${len}`);
            }
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
        let diffs: LineDiff[] = this.diffParser.getDiff();
        diffs = this.withoutReplacement(diffs);

        let num1: number = 1;
        let num2: number = 1;
        let tableRows: HTMLTableRowElement[];
        for (let i = 0, len = diffs.length; i < len; i++) {
            const diff: LineDiff = diffs[i];
            [num1, num2] = this.appendCodeRows(diff, num1, num2);

        }
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
}
