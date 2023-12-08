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
        byPath(virPattern: string | string[], options?: object): Promise<Resource>;
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
    export class AbstractReader {}
}

declare module '@ui5/fs/adapters/FileSystem' {
    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_adapters_FileSystem.html
     */
    export default class FileSystem {
        /**
         * @param {string} virBasePath Virtual base path. Must be absolute, POSIX-style, and must end with a slash
         * @param {string} fsBasePath File System base path. Must be absolute and must use platform-specific path segment separators
         */
        constructor({ virBasePath, fsBasePath }: { virBasePath: string; fsBasePath: string });
    }
}

declare module '@ui5/fs/resourceFactory' {
    /**
     * https://sap.github.io/ui5-tooling/stable/api/module-@ui5_fs_resourceFactory.html
     */

    /**
     * Creates a Workspace.
     *
     * @param {object} parameters Parameters to be provided
     * @param parameters.reader Single reader or collection of readers
     * @param parameters.writer A ReaderWriter instance which is only used for writing files.
     * @param {string} parameters.name Name of the collection
     * @param {string} parameters.virBasePath Virtual base path
     * @returns DuplexCollection which wraps the provided resource locators
     */
    export function createWorkspace({ reader, writer, virBasePath, name }: object): any;
}

declare module '@ui5/builder' {
    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_project_build_helpers_TaskUtil.html
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

declare module '@ui5/builder/tasks/generateLibraryManifest' {
    /**
     * https://sap.github.io/ui5-tooling/stable/api/module-@ui5_builder_tasks_generateLibraryManifest.html
     */

    /**
     * Task for creating a library manifest.json from its .library file.
     *
     * @param {object} parameters Parameters to be provided
     * @param parameters.workspace DuplexCollection to read and write files
     * @param parameters.taskUtil TaskUtil
     * @param {object} parameters.options Options
     * @param {string} parameters.options.projectName Project name
     * @returns {Promise<undefined>} Promise resolving with undefined once data has been written
     */
    export default function _default({ workspace, taskUtil, options: { projectName } }: object): Promise<undefined>;
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

            /**
             * Get the name of the project.
             */
            getName(): string;
        };
    }

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
