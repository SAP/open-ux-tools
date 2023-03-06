declare module '@ui5/fs' {
    /**
     * https://sap.github.io/ui5-tooling/api/module-@ui5_fs.Resource.html
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
    }

    /**
     * https://sap.github.io/ui5-tooling/api/module-@ui5_fs.DuplexCollection.html
     */
    export class DuplexCollection {
        /**
         *
         */
        byGlob(virPattern: string | string[], options?: object): Promise<Resource[]>;
    }

    /**
     * https://sap.github.io/ui5-tooling/api/module-@ui5_fs.AbstractReader.html
     */
    export class AbstractReader {}
}

declare module '@ui5/builder' {
    /**
     * https://sap.github.io/ui5-tooling/api/module-@ui5_builder.tasks.TaskUtil.html
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
