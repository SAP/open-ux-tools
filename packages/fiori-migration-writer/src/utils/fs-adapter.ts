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
import { access } from 'node:fs/promises';
import { AsyncLocalStorage } from 'node:async_hooks';
import fastGlob from 'fast-glob';
import { normalizePath } from './file-system-utils.js';

/**
 * AsyncLocalStorage for tracking the current migration's editor
 */
const editorContext = new AsyncLocalStorage<Editor>();

type StoreFile = { path: string; state?: string; contents: Buffer | null };

type EditorStore = {
    each: (callback: (file: StoreFile) => void) => void;
    get: (filepath: string) => { contents: Buffer | null };
};

type EditorWithStore = Editor & { store: EditorStore };

/**
 * Get editor from context, parameter, or create a new one.
 * Priority: explicit parameter > context > new instance
 *
 * @param editorOrPath - Editor instance or a path string
 */
export function getEditor(editorOrPath: string | Editor): Editor {
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
 * Load every file under a project folder into the mem-fs store.
 *
 * Pulling files into the store makes existence checks that scan the store (editorHasPath)
 * see the real project tree, so later writes do not overwrite untracked files. Loading via
 * the store's get() does not mark files as modified, so commit() still skips them.
 *
 * @param editor - Mem-fs editor whose store should be populated
 * @param projectRoot - Absolute path to the project folder to load
 */
export async function loadProjectIntoEditor(editor: Editor, projectRoot: string): Promise<void> {
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
 * Staging state of a path in a mem-fs editor, as seen by {@link getStagedState}.
 *
 * - `live`: the path (or a child, for directories) is staged with content
 * - `deleted`: the path itself is staged as deleted
 * - `unstaged`: the path is not present in the store at all
 */
const StagedState = { Live: 'live', Deleted: 'deleted', Unstaged: 'unstaged' } as const;
type StagedState = (typeof StagedState)[keyof typeof StagedState];

/**
 * A store entry represents live content when it is not staged for deletion and actually holds
 * bytes. A bare `store.get()` of a missing file leaves a content-less entry behind (state
 * `undefined`, contents `null`); such phantoms must not count as present.
 *
 * @param file - Store entry to test
 * @returns True when the entry has content and is not deleted
 */
function isLive(file: StoreFile): boolean {
    return file.state !== 'deleted' && file.contents !== null;
}

/**
 * Resolve how a path is staged in the editor's mem-fs store, without touching the real
 * filesystem. An exact match is authoritative (its deleted/live state wins); otherwise a
 * live child marks a directory as present.
 *
 * WARNING: Do NOT use editor.exists() as it has a side effect of staging the file!
 *
 * @param editor - Mem-fs editor to inspect
 * @param path - Absolute file or directory path
 * @returns The staging state of the path
 */
function getStagedState(editor: Editor, path: string): StagedState {
    // Normalize path separators to forward slashes for consistent comparison
    // mem-fs stores all paths with forward slashes regardless of OS
    const normalizedPath = normalizePath(path);
    const directoryPrefix = normalizedPath.endsWith('/') ? normalizedPath : normalizedPath + '/';
    let exactMatch: StoreFile | undefined;
    let hasLiveChild = false;

    (editor as EditorWithStore).store.each((file) => {
        // Normalize file path as well for comparison
        const normalizedFilePath = normalizePath(file.path);
        if (normalizedFilePath === normalizedPath) {
            exactMatch = file;
        } else if (normalizedFilePath.startsWith(directoryPrefix) && isLive(file)) {
            hasLiveChild = true;
        }
    });

    // A deleted entry is authoritative even though its contents are null.
    if (exactMatch?.state === 'deleted') {
        return StagedState.Deleted;
    }
    if (exactMatch && isLive(exactMatch)) {
        return StagedState.Live;
    }
    // Either no entry, or a content-less entry from a bare store.get() of a missing file:
    // treat as unstaged so callers fall back to the real filesystem.
    return hasLiveChild ? StagedState.Live : StagedState.Unstaged;
}

/**
 * Check whether an editor has a path staged with live content.
 *
 * This is a pure mem-fs store query: it does NOT consult the real filesystem, so a path that
 * only exists on disk (never loaded into the editor) reports as absent. Callers that also want
 * on-disk files to count (e.g. {@link exists}) must add their own filesystem fallback.
 *
 * @param editor - Mem-fs editor to inspect
 * @param path - Absolute file or directory path
 * @returns True when the path (or a child, for directories) is staged and not deleted
 */
export function editorHasPath(editor: Editor, path: string): boolean {
    return getStagedState(editor, path) === StagedState.Live;
}

/**
 * Check if a file/directory exists (async).
 *
 * When an editor is in context, its staging is authoritative: a staged write reports present and
 * a staged deletion reports absent (even if the file still exists on disk, because mem-fs stages
 * the delete until commit). Only when the path is not staged at all does this fall back to the
 * real filesystem, so files never loaded into mem-fs are not reported missing (and therefore not
 * silently overwritten).
 *
 * @param path - Path to check
 * @returns True if staged-live in mem-fs, or unstaged but present on the real filesystem
 */
export async function exists(path: string): Promise<boolean> {
    const editor = getCurrentEditor();
    if (editor) {
        const state = getStagedState(editor, path);
        if (state !== StagedState.Unstaged) {
            return state === StagedState.Live;
        }
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
