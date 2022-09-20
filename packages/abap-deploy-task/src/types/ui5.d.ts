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
         * Gets a string with the resource content.
         */
        getString(): Promise<string>;

        getBuffer(): Promise<Buffer>;
    }

    /**
     * https://sap.github.io/ui5-tooling/api/module-@ui5_fs.DuplexCollection.html
     */
    export class DuplexCollection {
        byGlob(virPattern: string | string[], options?: object): Promise<Resource[]>;
    }

    /**
     * https://sap.github.io/ui5-tooling/api/module-@ui5_fs.AbstractReader.html
     */
    export class AbstractReader {}
}

declare module '@ui5/builder.tasks' {
    /**
     *
     */
    export class TaskUtil {}
}
