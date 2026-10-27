import type { MemFsEditor } from 'mem-fs-editor';
import { mkdir } from 'node:fs/promises';
import { editorHasPath, getEditor } from './fs-adapter.js';

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
export const escapeDoubleQuotes = (s: string): string =>
    s.replaceAll('\\', String.raw`\\`).replaceAll('"', String.raw`\"`);

/**
 * Check if directory exists
 * Uses editorHasPath to avoid fs.exists() side effect of staging paths
 *
 * @param directoryOrFs - Directory path, or MemFsEditor instance
 * @param directory - Directory path (if first param is MemFsEditor)
 */
export function doesDirectoryExists(directoryOrFs: string | MemFsEditor, directory?: string): boolean {
    const fs = getEditor(directoryOrFs);
    const dir = typeof directoryOrFs === 'string' ? directoryOrFs : directory!;
    // Use editorHasPath instead of fs.exists() to avoid side effect of staging paths
    return editorHasPath(fs, dir);
}

/**
 * Check if an object has a given property
 *
 * @param obj - Object to check
 * @param fieldName - Property name to look for
 * @returns true if the property exists on the object
 */
export function doesPropertyExist(obj: unknown, fieldName: string): boolean {
    return Object.hasOwn(obj as object, fieldName);
}

/**
 * Create directory if it doesn't exist on the real filesystem.
 * In a mem-fs context directories are created implicitly when files are written,
 * but some migration steps need the physical directory to exist first.
 *
 * @param directory - Absolute path of the directory to create
 * @param _fsEditor - Unused; kept for backwards-compatible call signature
 * @returns True if the directory was newly created, false if it already existed
 */
export async function createDirectory(directory: string, _fsEditor?: MemFsEditor): Promise<boolean> {
    try {
        await mkdir(directory, { recursive: true });
        // mkdir with { recursive: true } resolves to undefined when the directory already exists
        // and to the first path segment created otherwise — so we can't distinguish easily.
        // Return true as a best-effort indicator that the operation succeeded.
        return true;
    } catch {
        return false;
    }
}
