function zeroPadding(num: number, digits: number): string {
    return (Array(digits).join('0') + num).slice(-digits);
}

function createId(): string {
    const time: number = new Date().getTime();
    const random: number = Math.random();
    return Math.floor(time + random * 1e+13).toString(16);
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

function round(number: number, precision: number) {
    const shift = (number: number, precision: number, reverseShift: boolean): number => {
        if (reverseShift) {
            precision = -precision;
        }  
        var numArray = ("" + number).split("e");
        return +(numArray[0] + "e" + (numArray[1] ? (+numArray[1] + precision) : precision));
    };
    return shift(Math.round(shift(number, precision, false)), precision, true);
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


export {zeroPadding, createId, date2str, str2date, bytes2str};
