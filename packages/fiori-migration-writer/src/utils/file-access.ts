/**
 * File access utilities using mem-fs-editor
 *
 * Uses editor from AsyncLocalStorage context set by runWithEditor().
 * Functions can also accept an explicit Editor parameter for backward compatibility.
 * If no editor is in context or provided, creates a temporary one (for tests/direct usage).
 */
// @ts-expect-error - no type definitions available
import parseJson from 'json-parse-even-better-errors';
import type { Editor } from 'mem-fs-editor';
import { createMemFsEditor, editorHasPath, getCurrentEditor } from './fs-adapter.js';

/**
 * Get editor from context, parameter, or create a new one
 * Priority: explicit parameter > context > new instance
 *
 * @param editorOrPath
 */
function getEditor(editorOrPath: string | Editor): Editor {
    if (typeof editorOrPath !== 'string') {
        return editorOrPath;
    }
    // Try to get from context
    const contextEditor = getCurrentEditor();
    if (contextEditor) {
        return contextEditor;
    }
    // Create a temporary one for backward compatibility (tests, direct API usage)
    // Note: This won't be automatically committed - caller must handle it
    return createMemFsEditor();
}

/**
 * Read a text file
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param path - Path to file (if first param is Editor)
 * @returns File contents as string
 */
export function readFile(pathOrFs: string | Editor, path?: string): string {
    const fs = getEditor(pathOrFs);
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : path!;
    return fs.read(filePath);
}

/**
 * Read a JSON file
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param path - Path to file (if first param is Editor)
 * @returns Parsed JSON object with indentation metadata for round-trip preservation
 */
export function readJSON<T = any>(pathOrFs: string | Editor, path?: string): T {
    const fs = getEditor(pathOrFs);
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : path!;
    const content = fs.read(filePath);

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
 * @param pathOrFs - Path to file, or Editor instance
 * @param path - Path to file (if first param is Editor)
 * @returns true if file exists, false otherwise
 */
export function fileExists(pathOrFs: string | Editor, path?: string): boolean {
    const fs = getEditor(pathOrFs);
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : path!;
    return editorHasPath(fs, filePath);
}

/**
 * Write a text file
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param contentOrPath - Content to write, or path (if first param is Editor)
 * @param content - Content to write (if first param is Editor)
 */
export function writeFile(pathOrFs: string | Editor, contentOrPath: string, content?: string): void {
    const fs = getEditor(pathOrFs);
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : contentOrPath;
    const fileContent = typeof pathOrFs === 'string' ? contentOrPath : content!;
    fs.write(filePath, fileContent);
}

/**
 * Update a text file
 * Alias for writeFile for backward compatibility
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param contentOrPath - Content to write, or path (if first param is Editor)
 * @param content - Content to write (if first param is Editor)
 */
export function updateFile(pathOrFs: string | Editor, contentOrPath: string, content?: string): void {
    writeFile(pathOrFs, contentOrPath, content);
}

/**
 * Update a JSON file while preserving indentation
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param contentOrPath - Object to write, or path (if first param is Editor)
 * @param _content - Object to write (if first param is Editor)
 */
export function updateJSON(pathOrFs: string | Editor, contentOrPath: string | object, _content?: object): void {
    const fs = getEditor(pathOrFs);
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : (contentOrPath as string);
    const fileContent = typeof pathOrFs === 'string' ? (contentOrPath as object) : _content!;

    try {
        // Read old contents and indentation of the JSON file
        const oldContentText = fs.read(filePath);
        const oldContentJson = parseJson(oldContentText);
        const indent = Symbol.for('indent');

        // Prepare new JSON file content with previous indentation
        const result = JSON.stringify(fileContent, null, oldContentJson[indent]) + '\n';
        fs.write(filePath, result);
    } catch {
        // File does not exist yet — write with 4-space indentation and trailing newline
        const newContent = JSON.stringify(fileContent, null, 4) + '\n';
        fs.write(filePath, newContent);
    }
}

/**
 * Delete a file
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param path - Path to file (if first param is Editor)
 */
export function deleteFile(pathOrFs: string | Editor, path?: string): void {
    const fs = getEditor(pathOrFs);
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : path!;
    fs.delete(filePath);
}
