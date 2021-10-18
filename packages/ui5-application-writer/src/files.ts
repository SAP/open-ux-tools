import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * @description Returns a flat list of all file paths under a directory tree,
 * recursing through all subdirectories
 * @param {string} dir - the directory to walk
 * @returns {string[]} - array of file path strings
 * @throws if an error occurs reading a file path
 */
export function getFilePaths(dir: string): string[] | [] {
    return readdirSync(dir).reduce((files: string[], entry: string) => {
        const entryPath = join(dir, entry);
        const isDirectory = statSync(entryPath).isDirectory();
        return isDirectory ? [...files, ...getFilePaths(entryPath)] : [...files, entryPath];
    }, []);
}
