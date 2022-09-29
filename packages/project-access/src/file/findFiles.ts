import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { dirname, join } from 'path';
import { sync as searchGlob } from 'glob';

/**
 * Add missing dump properties
 */
declare module 'mem-fs-editor' {
    type FileMap = { [key: string]: { state: 'modified' | 'deleted' } };

    export interface Editor {
        dump(cwd: string): FileMap;
    }
}

/**
 * Search for 'filename' starting from 'root'. Returns array of paths that contain the file.
 *
 * @param filename - filename to search
 * @param root - root folder to start search
 * @param stopFolders - list of folder names to exclude (search doesn't traverse into these folders)
 * @returns - array of path that contain the filename
 */
export function findFiles(filename: string, root: string, stopFolders: string[], fs?: Editor): string[] {
    const memFiles = fs ? fs.dump(root) : {};
    const modified = Object.keys(memFiles)
        .filter((file) => memFiles[file].state === 'modified' && file.endsWith(filename))
        .map((file) => join(root, file));
    const ignore = Object.keys(memFiles)
        .filter((file) => memFiles[file].state === 'deleted')
        .map((file) => join(root, file))
        .concat(...modified);

    const files = searchGlob(filename, {
        cwd: root,
        matchBase: true,
        absolute: true,
        ignore: stopFolders.map((folder) => `**/${folder}/**`)
    })
        .filter((match) => !ignore.includes(match))
        .map((match) => dirname(match));

    return files.concat(...modified.map((file) => dirname(file)));
}

/**
 * Find a file by name in parent folders starting from 'startPath'.
 *
 * @param fileName - file name to look for
 * @param startPath - path for start searching up
 * @returns - path to file name if found, otherwise undefined
 */
export function findFileUp(fileName: string, startPath: string, fs?: Editor): string | undefined {
    return findUp(fileName, startPath, fs ?? create(createStorage()));
}

function findUp(fileName: string, pathName: string, fs: Editor): string | undefined {
    const filePath = join(pathName, fileName);
    if (fs.exists(filePath)) {
        return filePath;
    } else {
        return dirname(pathName) !== pathName ? findUp(fileName, dirname(pathName), fs) : undefined;
    }
}
