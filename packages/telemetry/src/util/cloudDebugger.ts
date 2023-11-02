import fs from 'fs';
import os from 'os';
import path from 'path';
const homedir = os.homedir();
const debugFilePath = path.join(homedir, 'theiadebug.txt');

export const debug = (message: string, active = false) => {
    if (active) {
        fs.appendFileSync(debugFilePath, `${message}\n`, 'utf8');
    }
};
