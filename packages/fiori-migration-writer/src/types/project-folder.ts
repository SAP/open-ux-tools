/**
 * Generic project folder interface
 * Abstracts away VS Code's WorkspaceFolder for portability
 */
export interface ProjectFolder {
    /**
     * The associated uri for this workspace folder.
     */
    readonly uri: {
        /**
         * Returns a string representation of this uri's file system path.
         */
        readonly fsPath: string;
        /**
         * Uri scheme (e.g., 'file', 'untitled')
         */
        readonly scheme: string;
    };

    /**
     * The name of this workspace folder. Defaults to the basename of its uri.fsPath
     */
    readonly name: string;

    /**
     * The ordinal number of this workspace folder.
     */
    readonly index: number;
}

/**
 * Type guard to check if value is a ProjectFolder array
 *
 * @param value
 */
export function isProjectFolderArray(value: unknown): value is readonly ProjectFolder[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        value[0] !== null &&
        'uri' in value[0] &&
        typeof value[0].uri === 'object' &&
        'fsPath' in value[0].uri
    );
}
