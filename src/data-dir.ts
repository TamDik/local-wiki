import {app} from 'electron';
import * as fs from 'fs';
import * as path from 'path';


let APP_DIR: string;
if (typeof(app) === 'undefined') {
    APP_DIR = path.join(__dirname, '..');
} else {
    APP_DIR = app.getAppPath();
}

let dataDir: string = '';
if (APP_DIR.indexOf('app.asar') === -1) {
    dataDir = path.join(APP_DIR, 'data');
} else {
    const asarDir: string = path.join(APP_DIR, '../app.asar.unpacked');
    if (!fs.existsSync(asarDir)) {
        fs.mkdirSync(asarDir);
    }
    dataDir = path.join(asarDir, 'data');
}

const DATA_DIR: string = dataDir;
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

export {DATA_DIR, APP_DIR};
