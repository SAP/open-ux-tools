import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import type { Editor } from 'mem-fs-editor';
import { editorHasPath, createMemFsEditor } from './fs-adapter.js';

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
 * Check if directory exists.
 * Uses editorHasPath to avoid fs.exists() side effect of staging paths, then falls back
 * to the real filesystem for directories that are not yet staged in mem-fs.
 *
 * @param directory - Directory path
 * @param fsEditor - optional mem-fs editor; a fresh one is created when omitted
 */
export function doesDirectoryExists(directory: string, fsEditor?: Editor): boolean {
    const fs = fsEditor ?? createMemFsEditor();
    if (editorHasPath(fs, directory)) {
        return true;
    }
    return existsSync(directory);
}

/**
 * Create directory if it doesn't exist
 *
 * @param directory - Directory path to create
 * @param fsEditor - optional mem-fs editor; a fresh one is created when omitted
 * @returns True if directory was created, false if it already existed
 */
export async function createDirectory(directory: string, fsEditor?: Editor): Promise<boolean> {
    const fs = fsEditor ?? createMemFsEditor();
    let isCreated = false;
    if (!doesDirectoryExists(directory, fs)) {
        await mkdir(directory, { recursive: true });
        isCreated = true;
    }
    return isCreated;
}
