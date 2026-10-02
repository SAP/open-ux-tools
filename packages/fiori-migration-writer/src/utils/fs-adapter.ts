/**
 * Mem-fs editor utilities with context-based management
 *
 * Provides thread-safe, per-invocation Editor instances for the migration writer.
 * Uses AsyncLocalStorage to track the current migration's editor without requiring
 * it to be passed through every function call.
 */
import type { Editor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { existsSync } from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * AsyncLocalStorage for tracking the current migration's editor
 */
const editorContext = new AsyncLocalStorage<Editor>();

/**
 * Create a new mem-fs editor instance
 *
 * @returns New mem-fs editor instance
 */
export function createMemFsEditor(): Editor {
    const store = createMemFs();
    return createEditor(store);
}

/**
 * Run a function with an editor in context
 * The editor will be available to all functions called within the callback
 *
 * @param editor - Editor instance to use
 * @param callback - Function to run with the editor in context
 * @returns Result of the callback
 */
export function runWithEditor<T>(editor: Editor, callback: () => T | Promise<T>): T | Promise<T> {
    return editorContext.run(editor, callback);
}

/**
 * Get the current editor from context
 *
 * @returns Current editor or undefined if not in a migration context
 */
export function getCurrentEditor(): Editor | undefined {
    return editorContext.getStore();
}

/**
 * Check if an editor is available in the current context
 *
 * @returns True if editor is available
 */
export function isMemFsEnabled(): boolean {
    return getCurrentEditor() !== undefined;
}

/**
 * Check if file/directory exists
 * Uses editor from context if available, otherwise checks real filesystem
 *
 * @param path - Path to check
 * @returns True if exists
 */
export function exists(path: string): boolean {
    const editor = getCurrentEditor();
    if (editor) {
        // In mem-fs mode, check both mem-fs and real fs to support mixed scenarios
        return editor.exists(path) || existsSync(path);
    }
    return existsSync(path);
}

/**
 * Copy file using mem-fs or real filesystem
 *
 * @param src - Source path
 * @param dest - Destination path
 */
export function copyFile(src: string, dest: string): void {
    const editor = getCurrentEditor();
    if (editor) {
        editor.copy(src, dest);
    } else {
        throw new Error('Editor not available. Call runWithEditor() to set up migration context.');
    }
}

/**
 * Delete file using mem-fs or real filesystem
 *
 * @param path - Path to delete
 */
export function deleteFile(path: string): void {
    const editor = getCurrentEditor();
    if (editor) {
        editor.delete(path);
    } else {
        throw new Error('Editor not available. Call runWithEditor() to set up migration context.');
    }
}

/**
 * Create directory (no-op in mem-fs, directories created implicitly)
 *
 * @param _path - Directory path
 */
export function mkdir(_path: string): void {
    // mem-fs handles directories implicitly when writing files
    // No explicit mkdir needed
}

/**
 * Commit pending mem-fs changes to disk
 * Uses editor from context
 *
 * @returns Promise that resolves when commit is complete
 */
export function commit(): Promise<void> {
    const editor = getCurrentEditor();
    if (!editor) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        editor.commit((err: Error[]) => {
            if (err && err.length > 0) {
                reject(err[0]);
            } else {
                resolve();
            }
        });
    });
}
