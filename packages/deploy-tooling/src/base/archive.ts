import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Helper function to recursively get a list of all files in a given folder and its sub folders.
 *
 * @param path - path to the folder that is to be searched
 * @returns list of files names
 */
export function getFileNames(path: string): string[] {
    const names: string[] = [];

    const files = readdirSync(path);
    for (const file of files) {
        const filePath = join(path, file);
        if (statSync(filePath).isDirectory()) {
            names.push(...getFileNames(filePath));
        } else {
            names.push(filePath);
        }
    }
    return names;
}
