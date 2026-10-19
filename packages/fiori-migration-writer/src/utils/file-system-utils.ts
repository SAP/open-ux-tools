import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import type { Editor } from 'mem-fs-editor';
import { editorHasPath, getEditor, getCurrentEditor } from './fs-adapter.js';

/**
 * Normalize path separators to forward slashes for cross-platform compatibility
 * mem-fs and many tools expect forward slashes regardless of OS
 *
 * @param path - Path to normalize
 * @returns Path with forward slashes
 */
export const normalizePath = (path: string): string => path.replaceAll('\\', '/');

/**
 * stripSpaces
 *
 * @param val
 */
export const stripSpaces = (val: string): string => val.replaceAll(/\s/g, '');

/**
 * escapeSingleQuotes
 *
 * @param s
 */
export const escapeSingleQuotes = (s: string): string =>
    s.replaceAll('\\', String.raw`\\`).replaceAll("'", String.raw`\'`);

/**
 * escapeDoubleQuotes
 *
 * @param s
 */
export const escapeDoubleQuotes = (s: string): string => s.replaceAll('"', String.raw`\"`);

export function doesPropertyExist(obj: unknown, fieldName: string): boolean {
    return Object.hasOwn(obj as object, fieldName);
}

/**
 * Check if directory exists
 * Uses editorHasPath to avoid fs.exists() side effect of staging paths
 *
 * @param directoryOrFs - Directory path, or Editor instance
 * @param directory - Directory path (if first param is Editor)
 */
export function doesDirectoryExists(directoryOrFs: string | Editor, directory?: string): boolean {
    const dir = typeof directoryOrFs === 'string' ? directoryOrFs : directory!;
    const editor = typeof directoryOrFs === 'string' ? getCurrentEditor() : getEditor(directoryOrFs);
    if (editor && editorHasPath(editor, dir)) {
        return true;
    }
    return existsSync(dir);
}

/**
 * Create directory if it doesn't exist
 *
 * @param directory - Directory path to create
 * @returns True if directory was created, false if it already existed
 */
export async function createDirectory(directory: string): Promise<boolean> {
    let isCreated = false;
    if (!doesDirectoryExists(directory)) {
        await mkdir(directory, { recursive: true });
        isCreated = true;
    }
    return isCreated;
}
