import type { Editor } from 'mem-fs-editor';
import { editorHasPath, getEditor } from './fs-adapter.js';

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
 * @param directoryOrFs - Directory path, or Editor instance
 * @param directory - Directory path (if first param is Editor)
 */
export function doesDirectoryExists(directoryOrFs: string | Editor, directory?: string): boolean {
    const fs = getEditor(directoryOrFs);
    const dir = typeof directoryOrFs === 'string' ? directoryOrFs : directory!;
    // Use editorHasPath instead of fs.exists() to avoid side effect of staging paths
    return editorHasPath(fs, dir);
}
