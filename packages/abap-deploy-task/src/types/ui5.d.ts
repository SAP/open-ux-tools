declare module '@ui5/fs' {
    /**
     * https://sap.github.io/ui5-tooling/api/module-@ui5_fs.Resource.html
     */
    export class Resource {
        getPath(): string;
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
