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
import { sep } from 'node:path';

/**
 * AsyncLocalStorage for tracking the current migration's editor
 */
const editorContext = new AsyncLocalStorage<Editor>();

type EditorStore = {
    each: (callback: (file: { path: string }) => void) => void;
};

type EditorWithStore = Editor & { store: EditorStore };

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
 * Check whether an editor contains a file or a directory represented by staged files.
 *
 * @param editor - Mem-fs editor to inspect
 * @param path - Absolute file or directory path
 * @returns True when the path or one of its children is staged
 */
export function editorHasPath(editor: Editor, path: string): boolean {
    if (editor.exists(path)) {
        return true;
    }

    const directoryPrefix = path.endsWith(sep) ? path : path + sep;
    let found = false;
    (editor as EditorWithStore).store.each((file) => {
        if (file.path.startsWith(directoryPrefix)) {
            found = true;
        }
    });
    return found;
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
        // Use OR logic to avoid race condition between checks
        return editorHasPath(editor, path) || existsSync(path);
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
