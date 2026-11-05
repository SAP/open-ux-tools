/**
 * Mem-fs editor utilities.
 *
 * Provides per-invocation Editor instances for the migration writer. The editor is
 * threaded explicitly through the call tree (as in the other open-ux-tools writers),
 * so there is no implicit/global context here.
 */
import type { Editor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import fastGlob from 'fast-glob';
import { normalizePath } from './file-system-utils.js';

type EditorStore = {
    each: (callback: (file: { path: string; state?: string; contents: Buffer | null }) => void) => void;
    get: (filepath: string) => { contents: Buffer | null };
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
 * Check whether an editor contains a file or a directory represented by staged files.
 *
 * WARNING: Do NOT use editor.exists() for directories as it only reports files.
 *
 * @param editor - Mem-fs editor to inspect
 * @param path - Absolute file or directory path
 * @returns True when the path or one of its children is staged in mem-fs
 */
export function editorHasPath(editor: Editor, path: string): boolean {
    // Normalize path separators to forward slashes for consistent comparison
    // mem-fs stores all paths with forward slashes regardless of OS
    const normalizedPath = normalizePath(path);
    const directoryPrefix = normalizedPath.endsWith('/') ? normalizedPath : normalizedPath + '/';
    let found = false;

    (editor as EditorWithStore).store.each((file) => {
        if (file.state === 'deleted') {
            return;
        }
        // Ignore entries with no content: a missing path that was only probed via store.get()
        // (e.g. by fs.exists/fs.read) is cached with contents === null and must not count as present.
        if (file.contents === null) {
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
