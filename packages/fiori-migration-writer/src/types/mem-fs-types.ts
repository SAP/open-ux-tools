/**
 * Type definitions for mem-fs internal store API
 *
 * The mem-fs library's store API is not publicly typed, but we need to access it
 * for file iteration operations during migration. These types provide type safety
 * for the internal store methods we use.
 *
 * @see https://github.com/SBoudrias/mem-fs
 */

import type { Editor } from 'mem-fs-editor';

/**
 * Represents a file entry in the mem-fs store.
 * Each file tracked by mem-fs has these properties.
 */
export interface MemFsFile {
    /** Absolute path to the file */
    path: string;
    /** File contents as Buffer or string (null if deleted) */
    contents: Buffer | string | null;
    /** File state: 'modified', 'deleted', etc. */
    state: string;
}

/**
 * mem-fs store interface for internal operations.
 * Provides methods for iterating over tracked files.
 */
export interface MemFsStore {
    /**
     * Iterate over each file in the store.
     *
     * @param callback - Function called for each file entry
     */
    each: (callback: (file: MemFsFile) => void) => void;
}

/**
 * Extended Editor interface that exposes the internal store.
 * Use this type when you need to access the store for file iteration.
 *
 * @example
 * ```typescript
 * const editor = getCurrentEditor() as EditorWithStore;
 * editor.store.each((file) => {
 *     console.log(file.path);
 * });
 * ```
 */
export interface EditorWithStore extends Editor {
    /** Internal file store - use for iteration only */
    store: MemFsStore;
}

/**
 * Type guard to check if an editor has the store property.
 * This should always return true for mem-fs-editor instances,
 * but the guard provides type narrowing.
 *
 * @param editor - Editor instance to check
 * @returns true if the editor has a store property
 */
export function hasStore(editor: Editor): editor is EditorWithStore {
    return 'store' in editor && typeof (editor as EditorWithStore).store?.each === 'function';
}
