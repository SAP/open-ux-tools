import { realpathSync } from 'fs';
import { fileURLToPath } from 'url';

const driveLetter = process.platform === 'win32' ? realpathSync.native('\\')[0] : '';

/**
 *  Converts URI to path.
 *
 * @param uri - URI.
 * @returns File path.
 */
export function pathFromUri(uri: string): string {
    const parsedUri = fileURLToPath(uri);

    // for windows, some NodeJS methods will output uppercase drive letters, some in lowercase
    if (process.platform === 'win32') {
        return toggleCase(parsedUri.charAt(0)) + parsedUri.slice(1);
    }

    return parsedUri;
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
