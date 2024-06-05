import { promises as fs } from 'fs';
import type { Editor } from 'mem-fs-editor';
import { Manifest, Package } from '../types';
import { getJSONFileInfo, getJsonSpace } from './file-info';

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
 * Read file asynchronously. Throws error if file does not exist.
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
 */
export async function updatePackageJSON(path:string, packageJson: Package): Promise<void> {
    await updateJSON(path, packageJson);
}

/**
 * Updates manifest.json file asynchronously by keeping the previous indentation.
 *
 * @param path - path to file
 * @param manifest - updated manifest.json file content
 */
export async function updateManifestJSON(path: string, manifest: Manifest): Promise<void> {
    await updateJSON(path, manifest);
}

/**
 * Updates JSON file asynchronously by keeping the indentation from previous content with new content for given path.
 *
 * @param path - path to file
 * @param manifest - updated JSON file content
 */
async function updateJSON(path: string, content: object): Promise<void> {
    const oldContent = await readFile(path);
    // read spacing information from old content
    const fileInfo = getJSONFileInfo(oldContent);
    const calculatedSpace = getJsonSpace(fileInfo);
    let result;
    if (calculatedSpace && content) {
        // Spaces are identified and new content is not empty
        let result = JSON.stringify(content, null, calculatedSpace);
        if (fileInfo.eof) {
            result += fileInfo.eof;
        }
        await writeFile(path, result);
    } else {
        // Default spacing
        result = JSON.stringify(content, null, 4);
        await writeFile(path, result);
    }
}
