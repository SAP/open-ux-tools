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
 * WARNING: Do NOT use editor.exists() as it has a side effect of staging the file!
 *
 * @param editor - Mem-fs editor to inspect
 * @param path - Absolute file or directory path
 * @returns True when the path or one of its children is staged in mem-fs
 */
export function editorHasPath(editor: Editor, path: string): boolean {
    // Check if any files exist at or under this path in mem-fs
    // We check both exact path match and directory prefix match
    const directoryPrefix = path.endsWith(sep) ? path : path + sep;
    let found = false;

    (editor as EditorWithStore).store.each((file) => {
        // Check exact match OR files under this directory
        if (file.path === path || file.path.startsWith(directoryPrefix)) {
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
 * @returns True if exists in mem-fs (when editor available) OR on real filesystem
 */
export function exists(path: string): boolean {
    const editor = getCurrentEditor();
    if (editor) {
        // In mem-fs mode, check mem-fs only
        return editorHasPath(editor, path);
    }
    // No editor context - check real filesystem
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
        throw new Error('Editor not available. Call runWithEditor() to set up the migration context.');
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
        throw new Error('Editor not available. Call runWithEditor() to set up the migration context.');
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
