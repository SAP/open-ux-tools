/**
 * Native Node.js file access utilities
 *
 * These replace @sap/ux-project-access file I/O functions with native implementations.
 * This eliminates dependency on internal packages and makes the code open-source compatible.
 *
 * When mem-fs is enabled (via fs-adapter), all operations go through mem-fs.
 * Otherwise, operations use native Node.js fs.
 */
import { promises as fs, constants } from 'node:fs';
// @ts-expect-error - no type definitions available
import parseJson from 'json-parse-even-better-errors';
import * as fsAdapter from './fs-adapter.js';

/**
 * Read a text file asynchronously
 *
 * @param path - Path to file
 * @returns File contents as string
 */
export async function readFile(path: string): Promise<string> {
    if (fsAdapter.isMemFsEnabled()) {
        return fsAdapter.readFile(path);
    }
    return fs.readFile(path, { encoding: 'utf-8' });
}

/**
 * Read a JSON file asynchronously
 *
 * @param path - Path to JSON file
 * @returns Parsed JSON object with indentation metadata for round-trip preservation
 */
export async function readJSON<T = any>(path: string): Promise<T> {
    if (fsAdapter.isMemFsEnabled()) {
        return fsAdapter.readJSON<T>(path);
    }

    const content = await readFile(path);

    // Parse with JSON.parse for consistent SyntaxError behavior
    const result = JSON.parse(content);

    // Also parse with parseJson to extract indentation metadata
    // This is needed for updateJSON to preserve formatting
    try {
        const resultWithIndent = parseJson(content);
        // Copy indent metadata to the result object
        const indent = Symbol.for('indent');
        if (resultWithIndent[indent]) {
            result[indent] = resultWithIndent[indent];
        }
    } catch {
        // If parseJson fails, we still have the result from JSON.parse
        // updateJSON will use default 4-space indentation
    }

    return result as T;
}

/**
 * Check if a file exists
 *
 * @param path - Path to file
 * @returns true if file exists, false otherwise
 */
export async function fileExists(path: string): Promise<boolean> {
    if (fsAdapter.isMemFsEnabled()) {
        return fsAdapter.exists(path);
    }

    try {
        await fs.access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Write a text file asynchronously
 *
 * @param path - Path to file
 * @param content - Content to write
 */
export async function writeFile(path: string, content: string): Promise<void> {
    if (fsAdapter.isMemFsEnabled()) {
        await fsAdapter.writeFile(path, content);
        return;
    }
    await fs.writeFile(path, content, { encoding: 'utf-8' });
}

/**
 * Update a text file asynchronously
 * Alias for writeFile for backward compatibility
 *
 * @param path - Path to file
 * @param content - Content to write
 */
export async function updateFile(path: string, content: string): Promise<void> {
    await writeFile(path, content);
}

/**
 * Update a JSON file while preserving indentation
 *
 * @param path - Path to JSON file
 * @param content - Object to write
 */
export async function updateJSON(path: string, content: object): Promise<void> {
    if (fsAdapter.isMemFsEnabled()) {
        await fsAdapter.writeJSON(path, content, 4);
        return;
    }

    try {
        // Read old contents and indentation of the JSON file
        const oldContentText = await readFile(path);
        const oldContentJson = parseJson(oldContentText);
        const indent = Symbol.for('indent');

        // Prepare new JSON file content with previous indentation
        const result = JSON.stringify(content, null, oldContentJson[indent]) + '\n';
        await writeFile(path, result);
    } catch {
        // File does not exist yet — write with 4-space indentation and trailing newline.
        // Note: this changes output format vs the old mem-fs path which wrote compact JSON
        // without a trailing newline. Snapshot tests reflect the new format.
        const newContent = JSON.stringify(content, null, 4) + '\n';
        await writeFile(path, newContent);
    }
}

/**
 * Delete a file asynchronously
 *
 * @param path - Path to file
 */
export async function deleteFile(path: string): Promise<void> {
    if (fsAdapter.isMemFsEnabled()) {
        await fsAdapter.deleteFile(path);
        return;
    }
    await fs.unlink(path);
}
