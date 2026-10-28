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
 * Type guard to check if a single value is a valid ProjectFolder
 *
 * @param value - value to check
 * @returns true if value is a ProjectFolder
 */
function isProjectFolder(value: unknown): value is ProjectFolder {
    return (
        typeof value === 'object' &&
        value !== null &&
        'uri' in value &&
        typeof (value as any).uri === 'object' &&
        (value as any).uri !== null &&
        'fsPath' in (value as any).uri &&
        typeof (value as any).uri.fsPath === 'string' &&
        'scheme' in (value as any).uri &&
        typeof (value as any).uri.scheme === 'string' &&
        'name' in value &&
        typeof (value as any).name === 'string' &&
        'index' in value &&
        typeof (value as any).index === 'number'
    );
}

/**
 * Type guard to check if value is a ProjectFolder array
 * Validates every element in the array, not just the first one
 *
 * @param value - value to check
 * @returns true if value is an array of ProjectFolders
 */
export function isProjectFolderArray(value: unknown): value is readonly ProjectFolder[] {
    return Array.isArray(value) && value.length > 0 && value.every(isProjectFolder);
}
