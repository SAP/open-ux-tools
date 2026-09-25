import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

/**
 * stripSpaces
 *
 * @param val
 */
export const stripSpaces = (val: string): string => val.replace(/\s/g, '');

/**
 * escapeSingleQuotes
 *
 * @param s
 */
export const escapeSingleQuotes = (s: string): string => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/**
 * escapeDoubleQuotes
 *
 * @param s
 */
export const escapeDoubleQuotes = (s: string): string => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Check if directory exists
 *
 * @param directory
 */
export function doesDirectoryExists(directory: string): boolean {
    return existsSync(directory);
}

/**
 * Check if property exists on object
 *
 * @param obj
 * @param fieldName
 */
export function doesPropertyExist(obj: unknown, fieldName: string): boolean {
    return Object.hasOwn(obj as object, fieldName);
}

/**
 * Create directory if it doesn't exist
 *
 * @param directory
 */
export async function createDirectory(directory: string): Promise<boolean> {
    let isCreated = false;
    if (!doesDirectoryExists(directory)) {
        await mkdir(directory, { recursive: true });
        isCreated = true;
    }
    return isCreated;
}
