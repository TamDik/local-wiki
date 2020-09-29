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

export {createId, date2str, str2date};
