import type { Editor } from 'mem-fs-editor';

/**
 * mem-fs-editor types do not expose dump
 */
export type EditorWithDump = Editor & {
    dump: () => EditorChanges;
};

export interface EditorChanges {
    [filepath: string]: { contents: string; state: 'modified' | 'deleted' };
}
