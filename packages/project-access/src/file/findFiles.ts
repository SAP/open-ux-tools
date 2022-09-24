import { basename, dirname, sep } from 'path';
import { default as find } from 'findit2';
import findUp from 'find-up';

/**
 * Search for 'filename' starting from 'root'. Returns array of paths that contain the file.
 *
 * @param filename - filename to search
 * @param root - root folder to start search
 * @param stopFolders - list of folder names to exclude (search doesn't traverse into these folders)
 * @returns - array of path that contain the filename
 */
export async function findFiles(filename: string, root: string, stopFolders: string[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const results: string[] = [];
        const finder = find(root);
        finder.on('directory', (dir: string, stat: any, stop: () => void) => {
            const base = basename(dir);
            if (stopFolders.includes(base)) {
                stop();
            }
        });
        finder.on('file', (file: string) => {
            if (file.endsWith(sep + filename)) {
                results.push(dirname(file));
            }
        });
        finder.on('end', () => {
            resolve(results);
        });
        finder.on('error', (error: any) => {
            reject(error);
        });
    });
}

/**
 * Find a file by name in parent folders starting from 'startPath'.
 *
 * @param fileName - file name to look for
 * @param startPath - path for start searching up
 * @returns - path to file name if found, otherwise undefined
 */
export async function findFileUp(fileName: string, startPath: string): Promise<string | undefined> {
    return findUp(fileName, { cwd: startPath });
}
