declare module '@ui5/fs' {
    /**
     * https://sap.github.io/ui5-tooling/v2/api/module-@ui5_fs.Resource.html
     */
    export class Resource {
        /**
         * Gets the resources path
         */
        getPath(): string;

        /**
         * Gets a buffer with the resource content.
         */
        getBuffer(): Promise<Buffer>;

        /**
         * Gets a string with the resource content.
         */
        getString(): Promise<string>;
    }

    /**
     * https://sap.github.io/ui5-tooling/v2/api/module-@ui5_fs.ReaderCollection.html
     */
    export class ReaderCollection {
        /**
         * Locates resources by matching glob patterns.
         */
        byGlob(virPattern: string | string[], options?: object): Promise<Resource[]>;

        /**
         * Locates resources by matching a given path.
         */
        byPath(virPattern: string | string[], options?: object): Promise<Resource[]>;
    }

    /**
     * https://sap.github.io/ui5-tooling/v2/api/module-@ui5_fs.DuplexCollection.html
     */
    export class DuplexCollection extends ReaderCollection {}

    /**
     * https://sap.github.io/ui5-tooling/v2/api/module-@ui5_fs.AbstractReader.html
     */
    export class AbstractReader {}
}

declare module '@ui5/server' {
    export interface MiddlewareParameters<C> {
        /**
         * DuplexCollection to read and write files
         */
        resources: {
            all: ReaderCollection;
            dependencies: ReaderCollection;
            rootProject: ReaderCollection;
        };

        /**
         * Project specific options
         */
        options: {
            /**
             * Optional middleware configuration if provided in ui5*.yaml
             */
            configuration?: C;
        };

        /**
         * Middleware utilities (not yet used in our middlewares)
         */
        middlewareUtils: unknown;
    }
}

declare module '@ui5/builder' {
    /**
     * https://sap.github.io/ui5-tooling/v2/api/module-@ui5_builder.tasks.TaskUtil.html
     */
    export class TaskUtil {}

    export interface TaskParameters<C> {
        /**
         * DuplexCollection to read and write files
         */
        workspace: DuplexCollection;

        /**
         * Reader or Collection to read dependency files
         */
        dependencies: AbstractReader;

        /**
         * Specification Version dependent interface to a @ui5/builder.tasks.TaskUtil instance
         */
        taskUtil: TaskUtil;

        /**
         * Project specific options
         */
        options: {
            /**
             * Project name
             */
            projectName: string;

            /**
             * Project namespace if available
             */
            projectNamespace?: string;

            /**
             * Optional task configuration if provided in ui5*.yaml
             */
            configuration?: C;
        };
    }
}
