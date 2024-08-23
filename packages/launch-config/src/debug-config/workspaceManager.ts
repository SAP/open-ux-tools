import { dirname, join, relative, basename } from 'path';
import type { DebugOptions, WorkspaceHandlerInfo } from '../types';
import { formatCwd, getLaunchJsonPath, isFolderInWorkspace, handleAppsNotInWorkspace } from './helpers';

/**
 * Handles the case where an unsaved workspace is open and the user creates an app in a folder outside of the workspace.
 * This function updates the paths to reflect where the (possibly nested) target folder is located inside the workspace.
 *
 * @param {string} projectPath - The project's folder path including project name.
 * @param {any} vscode - The VS Code API object.
 * @returns {WorkspaceHandlerInfo} An object containing the path to the `launch.json` configuration file and the cwd for the launch configuration.
 */
export function handleUnsavedWorkspace(projectPath: string, vscode: any): WorkspaceHandlerInfo {
    const workspace = vscode.workspace;
    const wsFolder = workspace.getWorkspaceFolder(vscode.Uri.file(projectPath))?.uri?.fsPath;
    const nestedFolder = relative(wsFolder ?? projectPath, projectPath);
    return {
        launchJsonPath: join(wsFolder ?? projectPath),
        cwd: formatCwd(nestedFolder)
    };
}

/**
 * Handles the case where a previously saved workspace is open, and the user creates an app within or outside the workspace.
 * The function determines whether the project is inside the workspace and updates the launch configurations accordingly.
 *
 * @param {string} projectPath - The project's path including project name.
 * @param {string} projectName - The name of the project.
 * @param {string} targetFolder - The directory in which the project's files are located.
 * @param isAppStudio - A boolean indicating whether the current environment is BAS.
 * @param {any} vscode - The VS Code API object.
 * @returns {WorkspaceHandlerInfo} An object containing the path to the `launch.json` configuration file and the cwd for the launch configuration.
 */
export function handleSavedWorkspace(
    projectPath: string,
    projectName: string,
    targetFolder: string,
    isAppStudio: boolean,
    vscode: any
): WorkspaceHandlerInfo {
    const workspace = vscode.workspace;
    if (!isFolderInWorkspace(projectPath, workspace)) {
        return handleAppsNotInWorkspace(projectPath, isAppStudio, vscode);
    }
    const launchJsonPath = getLaunchJsonPath(workspace.workspaceFolders) ?? targetFolder;
    return {
        launchJsonPath,
        cwd: formatCwd(projectName)
    };
}

/**
 * Handles the case where a folder is open in VS Code, but no workspace file is associated with it.
 *
 * @param {string} projectPath - The project's path including project name.
 * @param {string} targetFolder - The directory in which the project's files are located.
 * @param isAppStudio - A boolean indicating whether the current environment is BAS.
 * @param {any} vscode - The VS Code API object.
 * @returns {WorkspaceHandlerInfo} An object containing the path to the `launch.json` configuration file and the cwd for the launch configuration.
 */
export function handleOpenFolderButNoWorkspaceFile(
    projectPath: string,
    targetFolder: string,
    isAppStudio: boolean,
    vscode: any
): WorkspaceHandlerInfo {
    const workspace = vscode.workspace;
    if (!isFolderInWorkspace(projectPath, workspace)) {
        return handleAppsNotInWorkspace(projectPath, isAppStudio, vscode);
    }
    // The user has chosen to generate the app in a folder or a nested folder.
    const wsFolder = workspace.getWorkspaceFolder(vscode.Uri.file(projectPath))?.uri?.fsPath;
    const nestedFolder = relative(wsFolder ?? projectPath, projectPath);
    const launchJsonPath = getLaunchJsonPath(workspace.workspaceFolders) ?? targetFolder;
    return {
        launchJsonPath,
        cwd: formatCwd(nestedFolder)
    };
}

/**
 * Manages the configuration of the debug workspace based on the provided options.
 * This function handles different scenarios depending on whether a workspace is open,
 * whether the project is inside or outside of a workspace, and other factors.
 *
 * @param {DebugOptions} options - The options used to determine how to manage the workspace configuration.
 * @param {string} options.projectPath -The project's path including project name.
 * @param {boolean} [options.isAppStudio] - A boolean indicating whether the current environment is BAS.
 * @param {boolean} [options.writeToAppOnly] - If true, write the launch configuration directly to the app folder, ignoring workspace settings.
 * @param {any} options.vscode - The VS Code API object.
 * @returns {WorkspaceHandlerInfo} An object containing the path to the `launch.json` configuration file, the cwd command, workspaceFolderUri if provided will enable reload.
 */
export function handleWorkspaceConfig(options: DebugOptions): WorkspaceHandlerInfo {
    const { projectPath, isAppStudio = false, writeToAppOnly = false, vscode } = options;

    const projectName = basename(projectPath);
    const targetFolder = dirname(projectPath);

    // Directly handle the case where we ignore workspace settings
    if (writeToAppOnly) {
        return handleAppsNotInWorkspace(projectPath, isAppStudio, vscode);
    }
    const workspace = vscode.workspace;
    const workspaceFile = workspace?.workspaceFile;
    // Handles the scenario where no workspace or folder is open in VS Code.
    if (!workspace) {
        return handleAppsNotInWorkspace(projectPath, isAppStudio, vscode);
    }
    // Handle case where a folder is open, but not a workspace file
    if (!workspaceFile) {
        return handleOpenFolderButNoWorkspaceFile(projectPath, targetFolder, isAppStudio, vscode);
    }
    // Handles the case where a previously saved workspace is open
    if (workspaceFile.scheme === 'file') {
        return handleSavedWorkspace(projectPath, projectName, targetFolder, isAppStudio, vscode);
    }
    // Handles the case where an unsaved workspace is open
    return handleUnsavedWorkspace(projectPath, vscode);
}
