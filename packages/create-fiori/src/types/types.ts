import type { Editor } from 'mem-fs-editor';

/**
 * mem-fs-editor types do not expose dump
 */
export type EditorWithDump = Editor & {
    dump: () => { [filepath: string]: { contents: string; state: 'modified' | 'deleted' } };
};
