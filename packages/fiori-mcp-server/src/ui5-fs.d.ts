declare module '@ui5/fs/resourceFactory' {
    export function createReader(options: {
        fsBasePath: string;
        virBasePath?: string;
        name?: string;
        excludes?: string[];
        project?: unknown;
    }): unknown;
    export function createWorkspace(options: {
        reader: unknown;
        writer?: unknown;
        virBasePath?: string;
        name?: string;
    }): unknown;
}
