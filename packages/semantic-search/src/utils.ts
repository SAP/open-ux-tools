import os from 'node:os';
import path from 'node:path';

/**
 * Get the platform-specific data directory for the application
 *
 * @param appName - The application name (defaults to 'semantic-search')
 * @returns The full path to the data directory
 */
export function getDataDir(appName = 'semantic-search'): string {
    const home = os.homedir();
    const platform = os.platform();

    let dir: string;

    if (platform === 'win32') {
        dir = process.env.LOCALAPPDATA || process.env.APPDATA || path.join(home, 'AppData', 'Local');
    } else {
        dir = process.env.XDG_DATA_HOME || path.join(home, '.local', 'share');
    }

    return path.join(dir, appName);
}
