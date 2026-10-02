/**
 * Global mem-fs editor management
 *
 * Provides a global Editor instance for the migration writer.
 * Aligns with open-ux-tools pattern of using pure mem-fs-editor.
 */
import type { Editor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { existsSync } from 'node:fs';

/**
 * Global mem-fs editor instance
 */
let memFsEditor: Editor | undefined;

/**
 * Enable mem-fs mode with provided editor
 *
 * @param editor - Mem-fs editor instance to use for file operations
 */
export function enableMemFs(editor: Editor): void {
    memFsEditor = editor;
}

/**
 * Disable mem-fs mode
 */
export function disableMemFs(): void {
    memFsEditor = undefined;
}

/**
 * Check if mem-fs mode is enabled
 *
 * @returns True if mem-fs mode is active
 */
export function isMemFsEnabled(): boolean {
    return memFsEditor !== undefined;
}

/**
 * Get current mem-fs editor (or create one if needed)
 *
 * @returns Mem-fs editor instance
 */
export function getOrCreateEditor(): Editor {
    if (!memFsEditor) {
        const store = createMemFs();
        memFsEditor = createEditor(store);
    }
    return memFsEditor;
}

/**
 * Get current mem-fs editor if one is active
 *
 * @returns Current editor or undefined
 */
export function getCurrentEditor(): Editor | undefined {
    return memFsEditor;
}

/**
 * Check if file/directory exists
 * Checks both mem-fs and real filesystem to support mixed testing scenarios
 *
 * @param path - Path to check
 * @returns True if exists
 */
export function exists(path: string): boolean {
    const fs = getOrCreateEditor();
    // Check mem-fs first, then fall back to real filesystem
    return fs.exists(path) || existsSync(path);
}

/**
 * Copy file using mem-fs
 *
 * @param src - Source path
 * @param dest - Destination path
 */
export function copyFile(src: string, dest: string): void {
    const fs = getOrCreateEditor();
    fs.copy(src, dest);
}

/**
 * Delete file using mem-fs
 *
 * @param path - Path to delete
 */
export function deleteFile(path: string): void {
    const fs = getOrCreateEditor();
    fs.delete(path);
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
 *
 * @returns Promise that resolves when commit is complete
 */
export function commit(): Promise<void> {
    if (memFsEditor) {
        return new Promise((resolve, reject) => {
            memFsEditor!.commit((err: Error[]) => {
                if (err && err.length > 0) {
                    reject(err[0]);
                } else {
                    resolve();
                }
            });
        });
    }
    return Promise.resolve();
}
