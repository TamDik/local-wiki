import {app} from 'electron';
import * as fs from 'fs';
import * as path from 'path';


let appPath: string;
if (typeof(app) === 'undefined') {
    appPath = path.join(__dirname, '..');
} else {
    appPath = app.getAppPath();
}

let dataDir: string = '';
if (appPath.indexOf('app.asar') === -1) {
    dataDir = path.join(appPath, 'data');
} else {
    dataDir = path.join(appPath, '../app.asar.unpacked/data');
}

const DATA_DIR: string = dataDir;
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

export {DATA_DIR};
