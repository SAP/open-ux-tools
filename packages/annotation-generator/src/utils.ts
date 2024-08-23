import { realpathSync } from 'fs';

/**
 * Toggles drive letter in the given path based on the os native drive letter representation (for windows only).
 *
 * @param path Path to adapt.
 * @returns Adapted path.
 */
export function adaptFilePath(path: string): string {
    let result = path;
    if (process.platform === 'win32') {
        const osDrive = realpathSync.native('/').charAt(0);
        const pathDrive = path.charAt(0);
        result =
            (osDrive === osDrive.toUpperCase() ? pathDrive.toUpperCase() : pathDrive.toLowerCase()) + path.slice(1);
    }
    return result;
}
