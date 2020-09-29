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
