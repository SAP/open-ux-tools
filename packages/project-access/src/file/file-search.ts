import type { Editor, FileMap } from 'mem-fs-editor';
import { basename, dirname, join, sep } from 'path';
import { default as find } from 'findit2';
import { fileExists } from './file-access';

/**
 * Creates a filter function that removes files that have been deleted in an instance of a mem-fs-editor.
 *
 * @param changes - changes recorded in an instance of a mem-fs-editor
 * @param filename - relevant filename
 * @returns a filter function for string arrays
 */
function getMemFsFilter(changes: FileMap, filename: string) {
    const deleted = Object.entries(changes)
        .filter(([, info]) => info.state === 'deleted')
        .map(([file]) => join(basename(join(file)) === filename ? dirname(file) : file));
    return (path: string) => !deleted.find((entry) => path.startsWith(entry));
}

/**
 * Concatanates the given list of files with additional files that have been created using a mem-fs-editor and matching the filename.
 *
 * @param folders - existing list of folders
 * @param changes - changes recorded in an instance of a mem-fs-editor
 * @param filename - relevant filename
 * @returns Concatanated and deduped list of folders containing the given filename
 */
function concatNewFoldersFromMemFs(folders: string[], changes: FileMap, filename: string): string[] {
    const modified = Object.entries(changes)
        .filter(([file, info]) => info.state === 'modified' && basename(join(file)) === filename)
        .map(([file]) => dirname(join(file)));
    return [...new Set([...folders, ...modified])];
}
/**
 * Search for 'filename' starting from 'root'. Returns array of paths that contain the file.
 *
 * @param filename - filename to search
 * @param root - root folder to start search
 * @param excludeFolders - list of folder names to exclude (search doesn't traverse into these folders)
 * @param fs - optional mem-fs-editor instance
 * @returns - array of paths that contain the filename
 */
export function findFiles(filename: string, root: string, excludeFolders: string[], fs?: Editor): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const results: string[] = [];
        const finder = find(root);
        finder.on('directory', (dir: string, _stat: unknown, stop: () => void) => {
            const base = basename(dir);
            if (excludeFolders.includes(base)) {
                stop();
            }
        });
        finder.on('file', (file: string) => {
            if (file.endsWith(sep + filename)) {
                results.push(dirname(file));
            }
        });
        finder.on('end', () => {
            if (fs) {
                const changes = fs.dump('');
                resolve(
                    concatNewFoldersFromMemFs(results, changes, filename).filter(getMemFsFilter(changes, filename))
                );
            } else {
                resolve(results);
            }
        });
        finder.on('error', (error: Error) => {
            reject(error);
        });
    });
}

/**
 * Find a file by name in parent folders starting from 'startPath'.
 *
 * @param fileName - file name to look for
 * @param startPath - path for start searching up
 * @param fs - optional mem-fs-editor instance
 * @returns - path to file name if found, otherwise undefined
 */
export async function findFileUp(fileName: string, startPath: string, fs?: Editor): Promise<string | undefined> {
    const filePath = join(startPath, fileName);
    if (await fileExists(filePath, fs)) {
        return filePath;
    } else {
        return dirname(startPath) !== startPath ? findFileUp(fileName, dirname(startPath), fs) : undefined;
    }
}
