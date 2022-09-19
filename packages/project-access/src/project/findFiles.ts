import { basename, dirname } from 'path';
import { default as find } from 'findit2';

/**
 * Find function to search through folders starting from root.
 *
 * @param root - root folder to start search
 * @param filename - filename to search
 * @param results - result collector (found paths will be added here)
 * @param stopFolders - list of folder names to exclude (search doesn't traverse into these folders)
 */
export async function findAll(root: string, filename: string, results: string[], stopFolders: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const finder = find(root);
        finder.on('directory', (dir: string, stat: any, stop: () => void) => {
            const base = basename(dir);
            if (stopFolders.indexOf(base) !== -1) {
                stop();
            }
        });
        finder.on('file', (file: string) => {
            if (file.endsWith(filename)) {
                results.push(dirname(file));
            }
        });
        finder.on('end', () => {
            resolve();
        });
        finder.on('error', (error: any) => {
            reject(error);
        });
    });
}
