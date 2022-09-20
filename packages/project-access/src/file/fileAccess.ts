import { promises as fs } from 'fs';

/**
 * Read file asynchronously.
 *
 * @param path - path to file
 * @returns - file content as string
 */
export async function readFile(path: string): Promise<string> {
    return fs.readFile(path, { encoding: 'utf8' });
}

/**
 * Read JSON file asynchronously.
 *
 * @param path - path to JSON file
 * @returns - file content as object of type T
 */
export async function readJSON<T>(path: string): Promise<T> {
    return JSON.parse(await readFile(path)) as T;
}

/**
 * Checks if the provided file exists in the file system.
 *
 * @param path - the file path to check
 * @returns - true if the file exists; false otherwise.
 */
export async function fileExists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}
