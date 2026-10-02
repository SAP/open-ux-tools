import { getOrCreateEditor } from './fs-adapter.js';
import type { Editor } from 'mem-fs-editor';

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
 * @param directoryOrFs - Directory path or Editor instance
 * @param directory - Directory path (if first param is Editor)
 */
export function doesDirectoryExists(directoryOrFs: string | Editor, directory?: string): boolean {
    const fs = typeof directoryOrFs === 'string' ? getOrCreateEditor() : directoryOrFs;
    const dir = typeof directoryOrFs === 'string' ? directoryOrFs : directory!;
    return fs.exists(dir);
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
 * Note: mem-fs handles directories implicitly, so this is a no-op
 *
 * @param directoryOrFs - Directory path or Editor instance
 * @param directory - Directory path (if first param is Editor)
 */
export function createDirectory(directoryOrFs: string | Editor, directory?: string): boolean {
    // mem-fs handles directories implicitly when writing files
    // Check if it exists for consistency
    const exists = doesDirectoryExists(directoryOrFs, directory);
    return !exists; // Return true if it didn't exist (was "created")
}
