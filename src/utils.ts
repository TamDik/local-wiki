function escapeRegex(str: string) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}


function escapeHtml(str: string): string {
    return str.replace(/[&'`"<>]/g, (match: string) => {
        switch (match) {
            case '&': return '&amp;';
            case "'": return '&#x27;';
            case '`': return '&#x60;';
            case '"': return '&quot;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            default: return match;
        }
    });
}


function isInteger(str: string): boolean {
    return str.match(/^-?(\d|[1-9]\d+)$/) !== null;
}


function isNaturalNumber(str: string): boolean {
    return str.match(/^[1-9]\d*$/) !== null;
}


function isNonNegativeNumber(str: string): boolean {
    return str.match(/^(\d|[1-9]\d*)$/) !== null;
}


function extensionOf(filename: string): string {
    if (!filename.includes('.')) {
        return '';
    }
    return filename.replace(/^.*\./, '');
}


function generateRandomString(len: number): string {
    const CHARS: string = '0123456789abcdefghijklmnopqrstuvwxyz';
    const charsLen: number = CHARS.length;
    const chosen: string[] = [];
    for (let i = 0; i < len; i++) {
        const index: number = Math.floor(Math.random() * charsLen);
        chosen.push(CHARS[index]);
    }
    return chosen.join('');
}


function zeroPadding(num: number, digits: number): string {
    return (Array(digits).join('0') + num).slice(-digits);
}


function dateToStr(date: Date): string {
    const h: string = zeroPadding(date.getHours(), 2);
    const i: string = zeroPadding(date.getMinutes(), 2);
    const d: string = zeroPadding(date.getDate(), 2);
    const m: string = [
        'January'  , 'February', 'March'   , 'April',
        'May'      , 'June'    , 'July'    , 'August',
        'September', 'October' , 'November', 'December'
    ][date.getMonth()];
    const y: string = zeroPadding(date.getFullYear(), 4);
    return `${h}:${i}, ${d} ${m} ${y}`;
}


function round(num: number, precision: number): number {
    function shift(num: number, precision: number, reverseShift: boolean): number {
        if (reverseShift) {
            precision = -precision;
        }  
        const numArray: string[] = ("" + num).split("e");
        return Number(numArray[0] + "e" + (numArray[1] ? (+numArray[1] + precision) : precision));
    };
    return shift(Math.round(shift(num, precision, false)), precision, true);
}


function bytesToStr(bytes: number): string {
    let digitalSize: number = bytes;
    if (digitalSize < 1024) {
        return round(digitalSize, 2) + ' B';
    }
    digitalSize /= 1024;
    if (digitalSize < 1024) {
        return round(digitalSize, 2) + ' KB';
    }
    digitalSize /= 1024;
    if (digitalSize < 1024) {
        return round(digitalSize, 2) + ' MB';
    }
    digitalSize /= 1024
    return round(digitalSize, 2) + ' GB';
}


function trim(s: string): string {
    return s.replace(/^\s+|\s+$/g, '');
}


function uniqueArr<T>(arr: T[]): T[] {
    return arr.filter((v: T, i: number, a: T[]) => i === a.indexOf(v));
}


function countArr<T=any>(arr: T[], val: T): number {
    let cnt: number = 0;
    for (const v of arr) {
        if (v === val) {
            cnt++;
        }
    }
    return cnt;
}


function compareLowerCase(a: string, b: string): number {
    return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
}


export {escapeRegex, escapeHtml, isInteger, isNaturalNumber, isNonNegativeNumber, extensionOf, generateRandomString, zeroPadding, dateToStr, bytesToStr, trim, uniqueArr, countArr, compareLowerCase};
