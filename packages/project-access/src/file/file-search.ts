import type { Editor, FileMap } from 'mem-fs-editor';
import { basename, dirname, extname, join, sep, posix } from 'node:path';
import { default as find, type FindError } from 'findit2';
import { fileExists } from './file-access';
import { promises as fs } from 'node:fs';

/**
 * Get deleted and modified files from mem-fs editor filtered by query and 'by' (name|extension).
 *
 * @param changes - memfs editor changes, usually retrieved by fs.dump()
 * @param fileNames - array of file names to search for
 * @param extensionNames - array of extensions names to search for
 * @param root - path to root folder
 * @example
 * // returns { deleted: ['src/test.css'], modified: ['src/app.js'] }
 * const changes = {
 *   'src/app.js': { state: 'modified' },
 *   'src/test.css': { state: 'deleted' },
 *   'src/index.ts': { state: 'modified' }
 * };
 * getMemFsChanges(changes, ['app.js'], ['.css'], 'src');
 * @returns - array of deleted and modified files filtered by query
 */
function getMemFsChanges(
    changes: FileMap,
    fileNames: string[],
    extensionNames: string[],
    root: string
): { deleted: string[]; modified: string[] } {
    const deleted: string[] = [];
    const modified: string[] = [];
    const filteredChanges = Object.keys(changes).filter(
        (f) =>
            f.startsWith(root.replaceAll(sep, posix.sep)) &&
            (fileNames.includes(basename(f)) ||
                extensionNames.includes(extname(f)) ||
                (fileNames.length === 0 && extensionNames.length === 0))
    );
    for (const file of filteredChanges) {
        if (changes[file].state === 'deleted') {
            deleted.push(join(file));
        }
        if (changes[file].state === 'modified') {
            modified.push(join(file));
        }
    }
    return { deleted, modified };
}

/**
 * Returns the search results and fatal errors.
 * This is required to include potential memfs changes in the search results.
 *
 * @param results - array of file paths that were found during the search.
 * @param fileNames - array of file names that were searched for
 * @param extensionNames - array of file extensions that were searched for
 * @param root - root directory where the search was performed
 * @param errors - array of errors that occurred during the search
 * @param [memFs] - optional memfs editor instance
 * @returns - object containing the search results and any fatal errors
 */
function getFindResultOnEnd(
    results: string[],
    fileNames: string[],
    extensionNames: string[],
    root: string,
    errors: FindError[],
    memFs?: Editor
): { searchResult: string[]; fatalErrors: FindError[] } {
    let searchResult = results;
    let fatalErrors = errors;

    if (memFs) {
        const { modified, deleted } = getMemFsChanges(memFs.dump(''), fileNames, extensionNames, root);
        const merged = Array.from(new Set([...results, ...modified]));
        searchResult = merged.filter((f) => !deleted.includes(f));
        // Filter out errors that are of type ENOENT and path is part of memfs changes, which can happen for folders that contain memfs files only.
        fatalErrors = errors.filter(
            (e) =>
                e.code !== 'ENOENT' ||
                (typeof e.path === 'string' && !modified.some((f) => f.startsWith(e.path as string)))
        );
    }
    return { searchResult, fatalErrors };
}

/**
 * Find function to search for files by names or file extensions.
 * Empty name and extension option returns all files in the given folder.
 *
 * @param options - find options
 * @param [options.fileNames] - optional array of file names to search for
 * @param [options.extensionNames] - optional array of file extensions to search for
 * @param options.root - folder to start recursive search
 * @param [options.excludeFolders] - optional array of folder names to exclude
 * @param [options.memFs] - optional memfs editor instance
 * @param [options.noTraversal] - optional flag to disable root path traversal
 * @returns - array of paths that contain the file
 * @throws Error[] - list of errors that occurred during the search
 */
export function findBy(options: {
    fileNames?: string[];
    extensionNames?: string[];
    root: string;
    excludeFolders?: string[];
    noTraversal?: boolean;
    memFs?: Editor;
}): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const results: string[] = [];
        const fileNames = Array.isArray(options.fileNames) ? options.fileNames : [];
        const extensionNames = Array.isArray(options.extensionNames) ? options.extensionNames : [];
        const excludeFolders = Array.isArray(options.excludeFolders) ? options.excludeFolders : [];
        const noTraversal = options.noTraversal ?? false;
        const errors: FindError[] = [];

        const finder = find(options.root);
        finder.on('directory', (dir: string, _stat: unknown, stop: () => void) => {
            const base = basename(dir);
            if (excludeFolders.includes(base) || (noTraversal && dir !== options.root)) {
                stop();
            }
        });
        finder.on('file', (file: string) => {
            if (
                extensionNames.includes(extname(file)) ||
                fileNames.includes(basename(file)) ||
                (fileNames.length === 0 && extensionNames.length === 0)
            ) {
                results.push(file);
            }
        });
        finder.on('end', () => {
            const { searchResult, fatalErrors } = getFindResultOnEnd(
                results,
                fileNames,
                extensionNames,
                options.root,
                errors,
                options.memFs
            );

            if (fatalErrors.length === 0) {
                resolve(searchResult);
            } else {
                // eslint-disable-next-line prefer-promise-reject-errors
                reject(fatalErrors);
            }
        });
        finder.on('error', (error: FindError) => {
            errors.push(error);
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
export async function findFiles(
    filename: string,
    root: string,
    excludeFolders: string[],
    memFs?: Editor
): Promise<string[]> {
    const results = await findBy({ fileNames: [filename], root, excludeFolders, memFs });
    return results.map((f) => dirname(f));
}

/**
 * Search for 'filename' starting from 'root'. Returns array of paths that contain the file.
 *
 * @param extension - file extension to search for including '.', e.g. '.ts'
 * @param root - root folder to start search
 * @param excludeFolders - list of folder names to exclude (search doesn't traverse into these folders)
 * @param [memFs] - optional mem-fs-editor instance
 * @param noTraversal - optional flag to disable root path traversal
 * @returns - array of file paths that have the extension
 */
export function findFilesByExtension(
    extension: string,
    root: string,
    excludeFolders: string[],
    memFs?: Editor,
    noTraversal?: boolean
): Promise<string[]> {
    return findBy({ extensionNames: [extension], root, excludeFolders, noTraversal, memFs });
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
/**
 * @description Returns a flat list of all file paths under a directory tree,
 * recursing through all subdirectories.
 * @param {string} dir - the directory to walk
 * @returns {string[]} - array of file path strings
 * @throws if an error occurs reading a file path
 */
export async function getFilePaths(dir: string): Promise<string[] | []> {
    const entries = await fs.readdir(dir);

    const filePathsPromises = entries.map(async (entry) => {
        const entryPath = join(dir, entry);
        const isDirectory = (await fs.stat(entryPath)).isDirectory();
        return isDirectory ? getFilePaths(entryPath) : entryPath;
    });

    const filePaths = await Promise.all(filePathsPromises);
    return ([] as string[]).concat(...filePaths);
}
