/**
 * Manually generated from https://www.npmjs.com/package/findit2
 */

declare module 'findit2' {
    function find(string): {
        /**
         * Fired for each path (file, directory, or symlink) found.
         */
        on(event: 'path', listener: (file: string, stat: unknown, linkPath?: string) => void): this;

        /**
         * Fired for each file found.
         */
        on(event: 'file', listener: (file: string, stat: unknown, linkPath?: string) => void): this;

        /**
         * Fired for each directory found. Calling stop() prevents traversing subdirectories.
         */
        on(
            event: 'directory',
            listener: (dir: string, stat: unknown, stop: () => void, linkPath?: string) => void
        ): this;

        /**
         * Fired for each symlink found.
         */
        on(event: 'link', listener: (file: string, stat: unknown) => void): this;

        /**
         * Fired when a symlink is read (if followSymlinks is enabled).
         */
        on(event: 'readlink', listener: (src: string, dst: string) => void): this;

        /**
         * Fired when the recursive walk is complete.
         */
        on(event: 'end', listener: () => void): this;

        /**
         * Fired when finder.stop() is called.
         */
        on(event: 'stop', listener: () => void): this;

        /**
         * Fired whenever an error occurs.
         */
        on(event: 'error', listener: (error: FindError) => void): this;
    };
    export type FindError = Error & { code?: string; path?: string };
    export = find;
}
