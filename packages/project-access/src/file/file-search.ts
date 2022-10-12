import type { Editor } from 'mem-fs-editor';
import { basename, dirname, join, sep } from 'path';
import { default as find } from 'findit2';
import { fileExists } from './file-access';

/**
 * Add missing dump function, mem-fs-editor types do not expose this.
 */
declare module 'mem-fs-editor' {
    type FileMap = { [key: string]: { state: 'modified' | 'deleted' } };

    export interface Editor {
        dump(cwd: string): FileMap;
    }
}

/**
 * Search for 'filename' starting from 'root' in the list of virtual (not committed) files. Returns array of paths that contain the file.
 *
 * @param files - - array of paths that contain the filename found on the filesystem
 * @param filename - filename to search
 * @param root - root folder to start search
 * @param stopFolders - list of folder names to exclude (search doesn't traverse into these folders)
 * @param fs - mem-fs-editor instance
 * @returns - enhanced array of paths that contain the filename
 */
function checkVirtualFiles(files: string[], filename: string, root: string, stopFolders: string[], fs: Editor) {
    const memFiles = fs.dump(root);
    const modified = Object.keys(memFiles)
        .filter((file) => memFiles[file].state === 'modified' && file.endsWith(filename))
        .map((file) => dirname(join(root, file)));
    const ignore = Object.keys(memFiles)
        .filter(
            (file) =>
                memFiles[file].state === 'deleted' ||
                stopFolders.find((folder) => file.includes(`${sep}${folder}${sep}`))
        )
        .map((file) => dirname(join(root, file)))
        .concat(...modified);
    return files.filter((match) => !ignore.includes(match)).concat(...modified);
}

/**
 * Search for 'filename' starting from 'root'. Returns array of paths that contain the file.
 *
 * @param filename - filename to search
 * @param root - root folder to start search
 * @param stopFolders - list of folder names to exclude (search doesn't traverse into these folders)
 * @param fs - optional mem-fs-editor instance
 * @returns - array of paths that contain the filename
 */
export function findFiles(filename: string, root: string, stopFolders: string[], fs?: Editor): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const results: string[] = [];
        const finder = find(root);
        finder.on('directory', (dir: string, _stat: unknown, stop: () => void) => {
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
            resolve(fs ? checkVirtualFiles(results, filename, root, stopFolders, fs) : results);
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
