import type { Editor } from 'mem-fs-editor';

/**
 * Add missing dump function declaration as mem-fs-editor types do not expose this.
 */
 declare module 'mem-fs-editor' {
    type FileMap = { [key: string]: { contents: string; state: 'modified' | 'deleted' } };

    export interface Editor {
        /**
         * Dump files to compare expected result. Provide a cwd for relative path.
         * See also https://github.com/SBoudrias/mem-fs-editor#dumpcwd-filter for further details.
         *
         * @param [cwd] - optional, relative path
         */
        dump(cwd?: string): FileMap;
    }
}