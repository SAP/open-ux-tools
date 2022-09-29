import type { URI as Uri } from 'vscode-uri';

/**
 * Copy of VSCode's WorkspaceFolder as devDependency to @types/vscode causes issues for consuming modules.
 */
export interface WorkspaceFolder {
    readonly uri: Uri;
    readonly name: string;
    readonly index: number;
}
