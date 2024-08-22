import { posix } from 'path';

/**
 * Retrieves the file system path to the `launch.json` file within the first opened folder.
 *
 * @param {Array} workspaceFolders - An array of workspace folders, provided by VS Code's API.
 * @param {object} workspaceFolders[].uri - The URI object representing the folder.
 * @param {string} workspaceFolders[].uri.fsPath - The file system path of the folder.
 * @returns {string | undefined} The file system path to the `launch.json` file in the first opened workspace folder,
 * or `undefined` if no workspace are available.
 */
export function getLaunchJsonPath(workspaceFolders: any): string | undefined {
    if (workspaceFolders && workspaceFolders.length > 0) {
        // We want the launch.json file from the first opened folder
        return workspaceFolders[0].uri.fsPath;
    }
    // No workspace open
    return undefined;
}

/**
 * Formats cwd by appending the provided path to the workspace folder path. If no path is provided, it returns the workspace folder path.
 *
 * @param {string} [path] - An optional path (project name or nested path) to append to the workspace folder path.
 * @returns {string} The formatted cwd string including the workspace folder and the provided path.
 * @example
 * // Returns "${workspaceFolder}/myProject"
 * formatCwd('myProject');
 * @example
 * // Returns "${workspaceFolder}/nested/path"
 * formatCwd('nested/path');
 * @example
 * // Returns "${workspaceFolder}"
 * formatCwd();
 */
export function formatCwd(path?: string): string {
    const formattedPath = path ? posix.sep + path : '';
    return `\${workspaceFolder}${formattedPath}`;
}

/**
 * Checks whether a given folder is part of the current workspace in VS Code.
 *
 * @param {string} selectedFolder - The file system path of the folder to check.
 * @param {any} workspace - The VS Code API workspace object, used to access workspace information.
 * @returns {boolean} - Returns `true` if the folder is in the workspace,
 * `false` if not, or `undefined` if no workspace is defined or accessible.
 */
export function isFolderInWorkspace(selectedFolder: string, workspace: any): boolean | undefined {
    const { workspaceFile, workspaceFolders } = workspace;
    // If neither workspaceFile nor workspaceFolders are present, return undefined.
    if (!workspaceFile && !workspaceFolders) {
        return undefined;
    }
    if (workspaceFolders) {
        return workspaceFolders.some(
            (folder: any) => folder.uri.fsPath && selectedFolder.toLowerCase().includes(folder.uri.fsPath.toLowerCase())
        );
    }
    // If workspaceFolders is undefined but workspaceFile is present, no folders are part of the workspace (return false).
    return false;
}
