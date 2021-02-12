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


// Date => yyyy/MM/dd HH:mm:ss
function date2str(date: Date): string {
    let formattedStr: string = '';
    formattedStr += zeroPadding(date.getFullYear(), 4) + '/';
    formattedStr += zeroPadding(date.getMonth() + 1, 2) + '/';
    formattedStr += zeroPadding(date.getDate(), 2) + ' ';
    formattedStr += zeroPadding(date.getHours(), 2) + ':';
    formattedStr += zeroPadding(date.getMinutes(), 2) + ':';
    formattedStr += zeroPadding(date.getSeconds(), 2);
    return formattedStr;
}


// yyyy/MM/dd HH:mm:ss => Date
function str2date(dateStr: string): Date {
    const temp: string[] = dateStr.split(' ');
    const ymd: string[] = temp[0].split('/');
    const hms: string[] = temp[1].split(':');
    return new Date(Number(ymd[0]), Number(ymd[1]) - 1, Number(ymd[2]),
                    Number(hms[0]), Number(hms[1]), Number(hms[2]));
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


function bytes2str(bytes: number): string {
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



export {generateRandomString, zeroPadding, date2str, str2date, bytes2str};
