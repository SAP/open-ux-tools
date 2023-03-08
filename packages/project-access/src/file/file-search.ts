import type { Editor, FileMap } from 'mem-fs-editor';
import { basename, dirname, extname, join } from 'path';
import { default as find } from 'findit2';
import { fileExists } from './file-access';

/**
 * Get deleted and modified files from mem-fs editor filtered by query and 'by' (name|extension).
 *
 * @param changes - memfs editor changes, usually retrieved by fs.dump()
 * @param query - search string, file name or file extension
 * @param by - search by file 'name' or file 'extension'
 * @returns - array of deleted and modified files filtered by query
 */
function getMemFsChanges(
    changes: FileMap,
    query: string,
    by: 'name' | 'extension'
): { deleted: string[]; modified: string[] } {
    const deleted: string[] = [];
    const modified: string[] = [];
    const getFilePartToCompare = by === 'extension' ? extname : basename;
    for (const file of Object.keys(changes).filter((f) => getFilePartToCompare(f) === query)) {
        if (changes[file].state === 'deleted') {
            deleted.push(file);
        }
        if (changes[file].state === 'modified') {
            modified.push(file);
        }
    }
    return { deleted, modified };
}

/**
 * Find function to search for files.
 *
 * @param options - find options
 * @param options.query - search string
 * @param options.by - search by file 'name' or file 'extension'
 * @param options.root - folder to start recursive search
 * @param options.excludeFolders - folder names to exclude
 * @param [options.memFs] - optional memfs editor instance
 * @returns - array of paths that contain the file if searched for name; array of full file paths in case of search by extension
 */
function findBy(options: {
    query: string;
    by: 'name' | 'extension';
    root: string;
    excludeFolders: string[];
    memFs?: Editor;
}): Promise<string[]> {
    const getFilePartToCompare = options.by === 'extension' ? extname : basename;
    return new Promise((resolve, reject) => {
        const results: string[] = [];
        const finder = find(options.root);
        finder.on('directory', (dir: string, _stat: unknown, stop: () => void) => {
            const base = basename(dir);
            if (options.excludeFolders.includes(base)) {
                stop();
            }
        });
        finder.on('file', (file: string) => {
            if (getFilePartToCompare(file) === options.query) {
                results.push(file);
            }
        });
        finder.on('end', () => {
            let searchResult: string[] = results;
            if (options.memFs) {
                const { modified, deleted } = getMemFsChanges(options.memFs.dump(''), options.query, options.by);
                const merged = Array.from(new Set([...results, ...modified]));
                searchResult = merged.filter((f) => !deleted.includes(f));
            }
            if (options.by === 'name') {
                searchResult = searchResult.map((f) => dirname(f));
            }
            resolve(searchResult);
        });
        finder.on('error', (error: Error) => {
            reject(error);
        });
    });
}

/**
 * Search for 'filename' starting from 'root'. Returns array of paths that contain the file.
 *
 * @param filename - filename to search
 * @param root - root folder to start search
 * @param excludeFolders - list of folder names to exclude (search doesn't traverse into these folders)
 * @param [memFs] - optional mem-fs-editor instance
 * @returns - array of paths that contain the filename
 */
export function findFiles(filename: string, root: string, excludeFolders: string[], memFs?: Editor): Promise<string[]> {
    return findBy({ query: filename, by: 'name', root, excludeFolders, memFs });
}

/**
 * Search for 'filename' starting from 'root'. Returns array of paths that contain the file.
 *
 * @param extension - file extension to search for including '.', e.g. '.ts'
 * @param root - root folder to start search
 * @param excludeFolders - list of folder names to exclude (search doesn't traverse into these folders)
 * @param [memFs] - optional mem-fs-editor instance
 * @returns - array of file paths that have the extension
 */
export function findFilesByExtension(
    extension: string,
    root: string,
    excludeFolders: string[],
    memFs?: Editor
): Promise<string[]> {
    return findBy({ query: extension, by: 'extension', root, excludeFolders, memFs });
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
