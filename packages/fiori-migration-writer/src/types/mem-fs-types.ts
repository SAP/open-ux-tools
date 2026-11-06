/**
 * Type definitions for mem-fs store access.
 *
 * mem-fs-editor v12 exposes the store publicly on the editor (`editor.store`), typed as
 * `Store<VinylMemFsEditorFile>`. These aliases keep the previous public surface of this module
 * stable for consumers while delegating to the native types.
 *
 * @see https://github.com/SBoudrias/mem-fs
 */

import type { MemFsEditor as Editor, VinylMemFsEditorFile } from 'mem-fs-editor';

/**
 * Represents a file entry in the mem-fs store (vinyl-based in v12).
 */
export type MemFsFile = VinylMemFsEditorFile;

/**
 * mem-fs store type exposed by the editor.
 */
export type MemFsStore = Editor['store'];

/**
 * Editor with its store exposed. v12 always exposes `store`, so this is just the editor type.
 */
export type EditorWithStore = Editor;

/**
 * Type guard retained for API compatibility. v12 editors always expose a usable `store`.
 *
 * @param editor - Editor instance to check
 * @returns true if the editor has a usable store property
 */
export function hasStore(editor: Editor): editor is EditorWithStore {
    return 'store' in editor && typeof editor.store?.each === 'function';
}
