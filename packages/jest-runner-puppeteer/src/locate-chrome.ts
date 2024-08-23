import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import which from 'which';

/**
 * Finds the path to the Google Chrome executable.
 *
 * @returns the path to the Google Chrome executable, or null if not found
 */
export function findChrome(): string | null {
    const osx = process.platform === 'darwin';
    const win = process.platform === 'win32';
    const other = !osx && !win;

    if (other) {
        try {
            return which.sync('google-chrome');
        } catch {
            return null;
        }
    } else if (osx) {
        const regPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        const altPath = join(homedir(), regPath.slice(1));

        return existsSync(regPath) ? regPath : altPath;
    } else {
        const suffix = '\\Google\\Chrome\\Application\\chrome.exe';
        const prefixes = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']];

        for (const element of prefixes) {
            const exe = element + suffix;
            if (existsSync(exe)) {
                return exe;
            }
        }
    }

    return null;
}
