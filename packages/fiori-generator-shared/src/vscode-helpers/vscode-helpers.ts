import { existsSync } from 'fs';
import os from 'os';
import { join } from 'path';
import { coerce, lt } from 'semver';

export const YEOMANUI_TARGET_FOLDER_CONFIG_PROP = 'ApplicationWizard.TargetFolder';
const DEFAULT_PROJECTS_FOLDER: string = join(os.homedir(), 'projects');

/**
 * Determines the target folder for the project.
 *
 * @param vscode - the vscode instance
 * @returns The default path, if it can be determined otherwise undefined.
 */
export function getDefaultTargetFolder(vscode: any): string | undefined {
    // CLI use will not define vscode
    if (!vscode) {
        return undefined;
    }
    const targetFolder = vscode.workspace?.getConfiguration().get(YEOMANUI_TARGET_FOLDER_CONFIG_PROP);

    if (targetFolder) {
        return targetFolder;
    }
    const workspace = vscode.workspace;

    // default to the first suitable folder found in the workspace folders
    if (workspace.workspaceFolders?.length > 0) {
        for (const folder of workspace.workspaceFolders) {
            if (folder.uri.scheme === 'file') {
                return folder.uri.fsPath;
            }
        }
    }
    // Otherwise use <home-dir>/projects,
    return existsSync(DEFAULT_PROJECTS_FOLDER) ? DEFAULT_PROJECTS_FOLDER : undefined;
}

/**
 * Check for an installed extension, optionally specifying a minimum version and activation state.
 * Note, this does not check for activation state unless `isActive` is specified.
 *
 * @param vscode - vscode instance
 * @param extensionId - the id of the extension to find
 * @param minVersion - the minimum version of the specified extension, lower versions will not be returned. Must be a valid SemVer string.
 * @param isActive - If `true`, the function will only return `true` if the extension is also active. Defaults to `true`.
 * @returns true if the extension is installed, the version is >= minVersion, and is active, false otherwise
 */
export function isExtensionInstalled(
    vscode: any,
    extensionId: string,
    minVersion?: string,
    isActive: boolean = true
): boolean {
    const foundExt = vscode?.extensions?.getExtension(extensionId);

    if (foundExt) {
        const extVersion = coerce(foundExt.packageJSON.version);

        if (extVersion) {
            // If a minimum version is specified and the extension's version is less than it, return false.
            if (minVersion && lt(extVersion, minVersion)) {
                return false;
            }

            // If the caller explicitly requires the extension to check if active, and it's not then return false.
            if (isActive && !foundExt.isActive) {
                return false;
            }

            return true;
        }
    }
    return false;
}

/**
 * Check if a specific command is registered in VS Code.
 *
 * @param vscode - vscode instance
 * @param commandId - the id of the command to check
 * @returns true if the command is registered, else false
 */
export async function isCommandRegistered(vscode: any, commandId: string): Promise<boolean> {
    const commands = await vscode.commands.getCommands();
    return commands.includes(commandId);
}
