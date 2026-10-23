/**
 * Mem-fs editor utilities with context-based management
 *
 * Provides thread-safe, per-invocation MemFsEditor instances for the migration writer.
 * Uses AsyncLocalStorage to track the current migration's editor without requiring
 * it to be passed through every function call.
 */
import type { MemFsEditor, VinylMemFsEditorFile } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { access } from 'node:fs/promises';
import { AsyncLocalStorage } from 'node:async_hooks';
import fastGlob from 'fast-glob';
import { normalizePath } from './file-system-utils.js';

/**
 * AsyncLocalStorage for tracking the current migration's editor
 */
const editorContext = new AsyncLocalStorage<MemFsEditor>();

type EditorStore = {
    each: (callback: (file: { path: string; state?: string }) => void) => void;
    get: (filepath: string) => { contents: Buffer | null };
};

type EditorWithStore = MemFsEditor & { store: EditorStore };

/**
 * Get editor from context, parameter, or create a new one.
 * Priority: explicit parameter > context > new instance
 *
 * @param editorOrPath - MemFsEditor instance or a path string
 */
export function getEditor(editorOrPath: string | MemFsEditor): MemFsEditor {
    if (typeof editorOrPath !== 'string') {
        return editorOrPath;
    }
    const contextEditor = getCurrentEditor();
    if (contextEditor) {
        return contextEditor;
    }
    return createMemFsEditor();
}

/**
 * Create a new mem-fs editor instance
 *
 * @returns New mem-fs editor instance
 */
export function createMemFsEditor(): MemFsEditor {
    const store = createMemFs<VinylMemFsEditorFile>();
    return createEditor(store);
}

/**
 * Run a function with an editor in context
 * The editor will be available to all functions called within the callback
 *
 * @param editor - MemFsEditor instance to use
 * @param callback - Function to run with the editor in context
 * @returns Result of the callback
 */
export function runWithEditor<T>(editor: MemFsEditor, callback: () => T | Promise<T>): T | Promise<T> {
    return editorContext.run(editor, callback);
}

/**
 * Load every file under a project folder into the mem-fs store.
 *
 * Pulling files into the store makes existence checks that scan the store (editorHasPath)
 * see the real project tree, so later writes do not overwrite untracked files. Loading via
 * the store's get() does not mark files as modified, so commit() still skips them.
 *
 * @param editor - Mem-fs editor whose store should be populated
 * @param projectRoot - Absolute path to the project folder to load
 */
export async function loadProjectIntoEditor(editor: MemFsEditor, projectRoot: string): Promise<void> {
    const files = await fastGlob('**/*', {
        cwd: projectRoot,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        absolute: true,
        onlyFiles: true,
        dot: true
    });
    const store = (editor as EditorWithStore).store;
    for (const file of files) {
        // get() lazily reads the file into the store without marking it modified.
        // The store resolves and keys the path itself; editorHasPath normalizes separators
        // at comparison time, so both sides stay consistent cross-platform.
        store.get(file);
    }
}

/**
 * Get the current editor from context
 *
 * @returns Current editor or undefined if not in a migration context
 */
export function getCurrentEditor(): MemFsEditor | undefined {
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
export function editorHasPath(editor: MemFsEditor, path: string): boolean {
    // Normalize path separators to forward slashes for consistent comparison
    // mem-fs stores all paths with forward slashes regardless of OS
    const normalizedPath = normalizePath(path);
    const directoryPrefix = normalizedPath.endsWith('/') ? normalizedPath : normalizedPath + '/';
    let found = false;

    (editor as EditorWithStore).store.each((file) => {
        if (file.state === 'deleted') {
            return;
        }
        // Normalize file path as well for comparison
        const normalizedFilePath = normalizePath(file.path);
        // Check exact match OR files under this directory
        if (normalizedFilePath === normalizedPath || normalizedFilePath.startsWith(directoryPrefix)) {
            found = true;
        }
    });

    return found;
}

/**
 * Check if a file/directory exists (async).
 *
 * When an editor is in context, the migration tree is already loaded into mem-fs, so a staged
 * path is authoritative. A real-filesystem check is still used as a fallback so files that were
 * never loaded into mem-fs are not reported missing (and therefore not silently overwritten).
 *
 * @param path - Path to check
 * @returns True if staged in mem-fs OR present on the real filesystem
 */
export async function exists(path: string): Promise<boolean> {
    const editor = getCurrentEditor();
    if (editor && editorHasPath(editor, path)) {
        return true;
    }
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
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
        throw new Error('MemFsEditor not available. Call runWithEditor() to set up the migration context.');
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
        throw new Error('MemFsEditor not available. Call runWithEditor() to set up the migration context.');
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
