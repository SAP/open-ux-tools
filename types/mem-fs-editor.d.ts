import type { Editor as _Editor } from 'mem-fs-editor';
import type File from 'vinyl';
/**
 * Add missing dump function declaration as mem-fs-editor types do not expose this.
 */
declare module 'mem-fs-editor' {
    export { create } from 'mem-fs-editor';

    export type FileMap = { [key: string]: { contents: string; state: 'modified' | 'deleted' } };

    export interface Editor extends _Editor {
        /**
         * Dump files to compare expected result. Provide a cwd for relative path.
         * See also https://github.com/SBoudrias/mem-fs-editor#dumpcwd-filter for further details.
         *
         * @param [cwd] - optional, relative path
         * @param [filter] - optional, function or glob to focus on specific files
         */
        dump(cwd?: string, filter?: string | ((file: File, cwd: string) => boolean)): FileMap;
    }
}
