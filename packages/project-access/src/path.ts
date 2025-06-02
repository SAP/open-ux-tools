import { realpathSync } from 'fs';
import { fileURLToPath } from 'url';

const driveLetter = process.platform === 'win32' ? realpathSync.native('\\')[0] : '';

/**
 *  Normalize URI to path.
 *
 * @param pathOrUri - URI or string.
 * @param parse - URI or string.
 * @returns File path.
 */
export function normalizePath(pathOrUri: string, parse = true): string {
    const parsedPath = parse ? fileURLToPath(pathOrUri) : pathOrUri;

    // for windows, some NodeJS methods will output uppercase drive letters, some in lowercase
    if (process.platform === 'win32') {
        return toggleCase(parsedPath.charAt(0)) + parsedPath.slice(1);
    }

    return parsedPath;
}

/**
 * Changes the drive letter to the same as `realpathSync`.
 *
 * @param character Drive letter character
 * @returns Normalized drive letter character
 */
function toggleCase(character: string): string {
    return driveLetter === driveLetter.toUpperCase() ? character.toUpperCase() : character.toLowerCase();
}
