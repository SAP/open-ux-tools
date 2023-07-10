declare module '@ui5/fs' {
    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_Resource.html
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

        /**
         * Gets the resource name.
         */
        getName(): string;
    }

    /**
    * https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_ReaderCollection.html
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
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_DuplexCollection.html
     */
    export class DuplexCollection {
        /**
         *
         */
        byGlob(virPattern: string | string[], options?: object): Promise<Resource[]>;
    }

    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_AbstractReader.html
     */
    export class AbstractReader { }
}

declare module '@ui5/builder' {
    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_project_build_helpers_TaskUtil.html
     */
    export class TaskUtil { }

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

declare module '@ui5/server' {
    export interface MiddlewareUtils {
        /**
         * Get project utilities.
         */
        getProject(): {
            /**
             * Get the full path of the project.
             */
            getRootPath(): string;

            /**
             * Get the full path of the source (webapp in case of an app) folder.
             */
            getSourcePath(): string;
        }
    };

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

        middlewareUtil: MiddlewareUtils;
    }
}