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

    // If this is not a workspace default to the first folder (`rootPath` is deprecated)
    if (workspace.workspaceFolders?.length > 0 && workspace.workspaceFolders[0].uri.scheme === 'file') {
        return workspace.workspaceFolders[0].uri.fsPath;
    }
    // Otherwise use <home-dir>/projects,
    return existsSync(DEFAULT_PROJECTS_FOLDER) ? DEFAULT_PROJECTS_FOLDER : undefined;
}

/**
 * Check for an installed extension, optionally specifying a minimum version.
 * Note, this does not check for activation state of specified extension.
 *
 * @param vscode - vscode instance
 * @param extensionId - the id of the extension to find
 * @param minVersion - the minimum version of the specified extension, lower versions will not be returned. Must be a valid SemVer string.
 * @returns true if the extension is installed and the version is >= minVersion (if provided), false otherwise
 */
export function isExtensionInstalled(vscode: any, extensionId: string, minVersion?: string): boolean {
    const foundExt = vscode?.extensions?.getExtension(extensionId);
    if (foundExt) {
        const extVersion = coerce(foundExt.packageJSON.version);
        if (extVersion) {
            // Check installed ver is >= minVersion or return true if minVersion is not specified
            return !(minVersion && lt(extVersion, minVersion));
        }
    }
    return false;
}
