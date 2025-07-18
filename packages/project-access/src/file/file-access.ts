import { promises as fs } from 'fs';
import type { Editor } from 'mem-fs-editor';
import type { Manifest, Package } from '../types';
import parseJsonError from 'json-parse-even-better-errors';

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
 * Write file asynchronously. Throws error if file does not exist.
 *
 * @param path - path to file
 * @param content - content to write to a file
 * @param memFs - optional mem-fs-editor instance
 * @returns - file content as string
 */
export async function writeFile(path: string, content: string, memFs?: Editor): Promise<string | void> {
    if (memFs) {
        return memFs.write(path, content);
    }

    return fs.writeFile(path, content, { encoding: 'utf8' });
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
 * Updates package.json file asynchronously by keeping the previous indentation.
 *
 * @param path - path to file
 * @param packageJson - updated package.json file content
 * @param memFs - optional mem-fs-editor instance
 */
export async function updatePackageJSON(path: string, packageJson: Package, memFs?: Editor): Promise<void> {
    await updateJSON(path, packageJson, memFs);
}

/**
 * Updates manifest.json file asynchronously by keeping the previous indentation.
 *
 * @param path - path to file
 * @param manifest - updated manifest.json file content
 * @param memFs - optional mem-fs-editor instance
 */
export async function updateManifestJSON(path: string, manifest: Manifest, memFs?: Editor): Promise<void> {
    await updateJSON(path, manifest, memFs);
}

/**
 * Updates JSON file asynchronously by keeping the indentation from previous content with new content for given path.
 *
 * @param path - path to file
 * @param content - updated JSON file content
 * @param memFs - optional mem-fs-editor instance
 */
async function updateJSON(path: string, content: object, memFs?: Editor): Promise<void> {
    // read old contents and indentation of the JSON file
    const oldContentText = await readFile(path, memFs);
    const oldContentJson = parseJsonError(oldContentText);
    const indent = Symbol.for('indent');
    // prepare new JSON file content with previous indentation
    const result = JSON.stringify(content, null, oldContentJson[indent]) + '\n';
    await writeFile(path, result, memFs);
}

/**
 * Deletes file asynchronously.
 *
 * @param path - path to file
 * @param memFs - optional mem-fs-editor instance
 * @returns Promise to void.
 */
export async function deleteFile(path: string, memFs?: Editor): Promise<void> {
    if (memFs) {
        return memFs.delete(path);
    }
    return fs.unlink(path);
}

/**
 * Read array of files from folder asynchronously.
 *
 * @param path - path to folder
 * @returns Array of the names of the files in the directory.
 */
export async function readDirectory(path: string): Promise<string[]> {
    return fs.readdir(path, { encoding: 'utf8' });
}

/**
 * Deletes folder asynchronously.
 *
 * @param path - path to folder
 * @param memFs - optional mem-fs-editor instance
 * @returns Promise to void.
 */
export async function deleteDirectory(path: string, memFs?: Editor): Promise<void> {
    if (memFs) {
        return memFs.delete(path);
    }
    return fs.rm(path, { recursive: true, force: true });
}
