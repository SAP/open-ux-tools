/**
 * File access utilities backed by a mem-fs editor.
 *
 * Every function takes the editor explicitly as its first argument, matching the
 * convention used across the other open-ux-tools writer packages. mem-fs reads from
 * the real filesystem on a cache miss, so these work for both staged and on-disk files.
 */
// @ts-expect-error - no type definitions available
import parseJson from 'json-parse-even-better-errors';
import type { Editor } from 'mem-fs-editor';
import { existsSync } from 'node:fs';
import { editorHasPath } from './fs-adapter.js';

/**
 * Read a text file.
 *
 * @param fs - mem-fs editor
 * @param path - Path to file
 * @returns File contents as string
 */
export function readFile(fs: Editor, path: string): string {
    return fs.read(path);
}

/**
 * Read and parse a JSON file, preserving indentation metadata (Symbol(indent))
 * so that a later updateJSON can keep the original formatting.
 *
 * @param fs - mem-fs editor
 * @param path - Path to file
 * @returns Parsed JSON object
 */
export async function readJSON<T = any>(fs: Editor, path: string): Promise<T> {
    // NOSONAR - intentionally async: public API whose callers await it and whose contract is a Promise.
    const content = fs.read(path);
    const result = JSON.parse(content) as T;
    try {
        const withIndent = parseJson(content);
        const indent = Symbol.for('indent');
        if ((withIndent as any)[indent]) {
            (result as any)[indent] = (withIndent as any)[indent];
        }
    } catch {
        // JSON.parse already succeeded; indentation metadata is best-effort.
    }
    return result;
}

/**
 * Check if a file or directory exists (staged in mem-fs or present on the real filesystem).
 *
 * Unlike mem-fs's `editor.exists()`, this also reports directories as present — many migration
 * checks test for folders (e.g. the webapp directory) — and reads through to the real filesystem
 * so files not yet staged in mem-fs are still seen.
 *
 * @param fs - mem-fs editor
 * @param path - Path to file or directory
 * @returns true if the path exists
 */
export function fileExists(fs: Editor, path: string): boolean {
    return editorHasPath(fs, path) || existsSync(path);
}

/**
 * Write a text file.
 *
 * @param fs - mem-fs editor
 * @param path - Path to file
 * @param content - Content to write
 */
export function writeFile(fs: Editor, path: string, content: string): void {
    fs.write(path, content);
}

/**
 * Update a text file. Alias of writeFile; kept as a distinct name for call-site clarity
 * (updating an existing file vs. creating a new one).
 */
export const updateFile = writeFile;

/**
 * Update a JSON file while preserving the indentation of the existing file.
 * New files are written with 4-space indentation and a trailing newline.
 *
 * @param fs - mem-fs editor
 * @param path - Path to file
 * @param content - Object to serialize
 */
export function updateJSON(fs: Editor, path: string, content: object): void {
    try {
        const oldContentJson = parseJson(fs.read(path));
        const indent = Symbol.for('indent');
        fs.write(path, JSON.stringify(content, null, oldContentJson[indent]) + '\n');
    } catch {
        // Expected: file may not exist yet or may contain invalid JSON (new file creation).
        fs.write(path, JSON.stringify(content, null, 4) + '\n');
    }
}

/**
 * Delete a file.
 *
 * @param fs - mem-fs editor
 * @param path - Path to file
 */
export function deleteFile(fs: Editor, path: string): void {
    fs.delete(path);
}
