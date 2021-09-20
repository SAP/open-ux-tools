import { join } from 'path';
import { readdirSync, statSync } from 'fs';

/**
 * Returns the file paths of all files under the specified directory.
 * 
 * @param {string} dir - the directory to walk
 * @returns {string[]} - array of file path strings
 */
export function getFilePaths(dir: string): string[] | [] {
    try {
        return readdirSync(dir).reduce((files: string[], file: string) => {
            const name = join(dir, file);
            const isDirectory = statSync(name).isDirectory();
            return isDirectory ? [...files, ...getFilePaths(name)] : [...files, name];
        }, []);
    } catch (err) {}  // eslint-disable-line no-empty
    return [];
}