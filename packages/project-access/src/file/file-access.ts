import { promises as fs } from 'fs';
import type { Editor } from 'mem-fs-editor';

/**
 * Read file asynchronously. Throws error if file does not exist.
 *
 * @param path - path to file
 * @param memFs - optional mem-fs-editor instance
 * @returns - file content as string
 */
export async function readFile(path: string, memFs?: Editor): Promise<string> {
    if (memFs) {
        return memFs.read(path);
    } else {
        return fs.readFile(path, { encoding: 'utf8' });
    }
}

/**
 * Read JSON file asynchronously. Throws error if file does not exist or is malformatted.
 *
 * @param path - path to JSON file
 * @param memFs - optional mem-fs-editor instance
 * @returns - file content as object of type T
 */
export async function readJSON<T>(path: string, memFs?: Editor): Promise<T> {
    if (memFs) {
        return memFs.readJSON(path) as unknown as T;
    } else {
        return JSON.parse(await readFile(path)) as T;
    }
}

/**
 * Checks if the provided file exists in the file system.
 *
 * @param path - the file path to check
 * @param memFs - optional mem-fs-editor instance
 * @returns - true if the file exists; false otherwise.
 */
export async function fileExists(path: string, memFs?: Editor): Promise<boolean> {
    try {
        if (memFs) {
            return memFs.exists(path);
        } else {
            await fs.access(path);
            return true;
        }
    } catch {
        return false;
    }
}

/**
 * Delete a File asynchronously.
 *
 * @param {string} path to file
 * @param {Editor} memFs optional mem-fs-editor instance
 * @returns {*}  {Promise<void>}
 */
export async function deleteFile(path: string, memFs?: Editor): Promise<void> {
    if (memFs) {
        return memFs?.delete(path);
    } else {
        return await fs.unlink(path);
    }
}

/**
 * If content === null or undefined, then the file will be deleted,otherwise it will be created or updated.
 *
 * @param path root directory for the file updates
 * @param content path+content tuples representing the files
 * @param {Editor} memFs optional mem-fs-editor instance
 * @returns Promise<void>
 */
export async function updateFile(path: string, content: string, memFs?: Editor): Promise<void> {
    if (content === null || content === undefined) {
        return deleteFile(path);
    } else if (memFs) {
        memFs?.write(path, content);
        return Promise.resolve();
    } else {
        return fs.writeFile(path, content, { encoding: 'utf8' });
    }
}
