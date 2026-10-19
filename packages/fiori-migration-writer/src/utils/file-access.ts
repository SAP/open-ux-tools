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
import { readFile as fsReadFile, access } from 'node:fs/promises';
import { unlinkSync } from 'node:fs';
import {
    editorHasPath,
    getCurrentEditor,
    exists as fsAdapterExists,
    getEditor,
    createMemFsEditor
} from './fs-adapter.js';
import { commitFileSystemChanges } from '../files/file-system.js';

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
 * @returns Parsed JSON object
 */
export async function readJSON<T = any>(pathOrFs: string | Editor, path?: string): Promise<T> {
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : path!;

    // When called with just a path string and no editor context, read from filesystem directly
    // This keeps behavior consistent with fileExists which also falls back to real filesystem
    let content: string;
    if (typeof pathOrFs === 'string' && !getCurrentEditor()) {
        content = await fsReadFile(filePath, 'utf-8');
    } else {
        const fs = getEditor(pathOrFs);
        content = fs.read(filePath);
    }

    const result = JSON.parse(content) as T;
    // Also parse with parseJson to extract indentation metadata (Symbol(indent))
    // needed for updateJSON to preserve formatting
    try {
        const resultWithIndent = parseJson(content);
        const indent = Symbol.for('indent');
        if ((resultWithIndent as any)[indent]) {
            (result as any)[indent] = (resultWithIndent as any)[indent];
        }
    } catch {
        // If parseJson fails, we still have the result from JSON.parse
    }
    return result;
}

/**
 * Check if a file exists
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param path - Path to file (if first param is Editor)
 * @returns true if file exists, false otherwise
 */
export async function fileExists(pathOrFs: string | Editor, path?: string): Promise<boolean> {
    // String path: delegate to the single shared existence check (mem-fs staged OR real fs).
    if (typeof pathOrFs === 'string') {
        return fsAdapterExists(pathOrFs);
    }

    // Explicit editor argument: check that editor's staged files, then fall back to real fs.
    // The real-fs fallback prevents overwriting files not yet loaded into the given editor
    // (e.g., the mockserver.js overwrite bug).
    const filePath = path!;
    if (editorHasPath(pathOrFs, filePath)) {
        return true;
    }
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Write a text file
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param contentOrPath - Content to write, or path (if first param is Editor)
 * @param content - Content to write (if first param is Editor)
 */
export async function writeFile(pathOrFs: string | Editor, contentOrPath: string, content?: string): Promise<void> {
    const fs = getEditor(pathOrFs);
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : contentOrPath;
    const fileContent = typeof pathOrFs === 'string' ? contentOrPath : content!;
    fs.write(filePath, fileContent);
}

/**
 * Update a text file.
 * Uses the context editor (inside runWithEditor) or an explicit editor if provided.
 * Outside any migration context, creates a temporary editor and commits immediately.
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param contentOrPath - Content to write, or path (if first param is Editor)
 * @param content - Content to write (if first param is Editor)
 */
export async function updateFile(pathOrFs: string | Editor, contentOrPath: string, content?: string): Promise<void> {
    if (typeof pathOrFs === 'string' && !getCurrentEditor()) {
        const editor = createMemFsEditor();
        const filePath = pathOrFs;
        editor.write(filePath, contentOrPath);
        await commitFileSystemChanges(editor);
        return;
    }
    await writeFile(pathOrFs, contentOrPath, content);
}

/**
 * Update a JSON file while preserving indentation.
 * Uses the context editor (inside runWithEditor) or an explicit editor if provided.
 * Outside any migration context, creates a temporary editor and commits immediately.
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param contentOrPath - Object to write, or path (if first param is Editor)
 * @param _content - Object to write (if first param is Editor)
 */
export async function updateJSON(
    pathOrFs: string | Editor,
    contentOrPath: string | object,
    _content?: object
): Promise<void> {
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : (contentOrPath as string);
    const fileContent = typeof pathOrFs === 'string' ? (contentOrPath as object) : _content!;

    const fs = typeof pathOrFs === 'string' && !getCurrentEditor() ? createMemFsEditor() : getEditor(pathOrFs);
    const shouldCommit = typeof pathOrFs === 'string' && !getCurrentEditor();

    try {
        // mem-fs reads from real FS on cache miss, so fs.read() works for existing files
        const oldContentText = fs.read(filePath);
        const oldContentJson = parseJson(oldContentText);
        const indent = Symbol.for('indent');
        const result = JSON.stringify(fileContent, null, oldContentJson[indent]) + '\n';
        fs.write(filePath, result);
    } catch {
        // Expected: file may not exist yet or may contain invalid JSON (new file creation scenario).
        const newContent = JSON.stringify(fileContent, null, 4) + '\n';
        fs.write(filePath, newContent);
    }

    if (shouldCommit) {
        await commitFileSystemChanges(fs);
    }
}

/**
 * Delete a file
 *
 * @param pathOrFs - Path to file, or Editor instance
 * @param path - Path to file (if first param is Editor)
 */
export function deleteFile(pathOrFs: string | Editor, path?: string): void {
    const editor = typeof pathOrFs === 'string' ? getCurrentEditor() : getEditor(pathOrFs);
    const filePath = typeof pathOrFs === 'string' ? pathOrFs : path!;
    if (editor) {
        editor.delete(filePath);
    } else {
        // No mem-fs context: delete from real filesystem synchronously
        try {
            unlinkSync(filePath);
        } catch {
            /* ignore if already deleted */
        }
    }
}
