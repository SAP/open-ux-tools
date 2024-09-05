import { posix, basename, dirname, join } from 'path';
import type { WorkspaceHandlerInfo } from '../types';

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
        return workspaceFolders[0].uri.fsPath;
    }
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
    if (!workspaceFile && !workspaceFolders) {
        return undefined;
    }
    if (workspaceFolders) {
        return workspaceFolders.some(
            (folder: any) => folder.uri.fsPath && selectedFolder.toLowerCase().includes(folder.uri.fsPath.toLowerCase())
        );
    }
    return false;
}

/**
 * Creates a launch configuration for applications not included in the current workspace.
 * This function generates the cwd comman, the path to the launch.json file,
 * and optionally provides a URI for updating workspace folders if the environment is not BAS.
 *
 * @param {string} projectPath - The full path of the project for which the launch configuration is being created.
 * @param isAppStudio - A boolean indicating whether the current environment is BAS.
 * @param {any} vscode - An instance of the VSCode API.
 * @returns {WorkspaceHandlerInfo} - An object containing the cwd, launch.json path, and optionally, the URI for updating workspace folders.
 */
export function handleAppsNotInWorkspace(projectPath: string, isAppStudio: boolean, vscode: any): WorkspaceHandlerInfo {
    const projectName = basename(projectPath);
    const launchJsonPath = join(dirname(projectPath), projectName);
    return {
        cwd: formatCwd(),
        launchJsonPath,
        workspaceFolderUri: !isAppStudio ? vscode.Uri?.file(launchJsonPath) : undefined
    };
}
