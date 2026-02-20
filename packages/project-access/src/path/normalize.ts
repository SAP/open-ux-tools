import { realpathSync } from 'node:fs';

let toUpperCase: boolean;

/**
 *  Normalize path to canonical form.
 *
 * @param path - URI or string.
 * @returns File path.
 */
export function normalizePath(path: string): string {
    // for windows, some NodeJS methods will output uppercase drive letters, some in lowercase
    if (process.platform === 'win32') {
        if (toUpperCase === undefined) {
            const driveLetter = realpathSync.native('\\')[0];
            toUpperCase = driveLetter === driveLetter.toUpperCase();
        }
        const correctedDriveLetter = toUpperCase ? path.charAt(0).toUpperCase() : path.charAt(0).toLowerCase();
        return correctedDriveLetter + path.slice(1);
    }

    return path;
}
