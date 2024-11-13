import { existsSync } from 'fs';
import { DEFAULT_PROJECTS_FOLDER, YEOMANUI_TARGET_FOLDER_CONFIG_PROP } from './constants';

/**
 * Get the resource URLs for the UShell bootstrap and UI5 bootstrap based on project type and UI5 framework details.
 *
 * @param {boolean} isEdmxProjectType - Indicates if the project is of type Edmx or CAP.
 * @param {string} [frameworkUrl] - The URL of the UI5 framework.
 * @param {string} [version] - The version of the UI5 framework.
 * @returns {{ uShellBootstrapResourceUrl: string, uiBootstrapResourceUrl: string }} - The resource URLs for UShell bootstrap and UI bootstrap.
 */
export function getBootstrapResourceUrls(
    isEdmxProjectType: boolean,
    frameworkUrl?: string,
    version?: string
): { uShellBootstrapResourceUrl: string; uiBootstrapResourceUrl: string } {
    // Constants for relative paths
    const relativeUshellPath = '/test-resources/sap/ushell/bootstrap/sandbox.js';
    const relativeUiPath = '/resources/sap-ui-core.js';
    // Construct version path if version is provided
    const versionPath = version ? `/${version}` : '';

    // Determine the resource URL for the UShell bootstrap based on the project type and framework URL availability
    const uShellBootstrapResourceUrl =
        isEdmxProjectType || !frameworkUrl
            ? `..${relativeUshellPath}`
            : `${frameworkUrl}${versionPath}${relativeUshellPath}`;

    // Determine the resource URL for the UI5 bootstrap based on the project type and framework URL availability
    const uiBootstrapResourceUrl =
        isEdmxProjectType || !frameworkUrl ? `..${relativeUiPath}` : `${frameworkUrl}${versionPath}${relativeUiPath}`;

    return { uShellBootstrapResourceUrl, uiBootstrapResourceUrl };
}

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
 * Removes any `-api` suffix in the first label of the hostname.
 * Required for local preview in VSCode with S/4 Hana Public Cloud systems.
 *
 * @param url - the url to check
 * @returns url without `-api` suffix
 */
export function removeApiHostname(url: string): string {
    const urlObj = new URL(url);
    urlObj.hostname = urlObj.hostname.replace(/-api(\.|$)/, '$1');
    return urlObj.origin + urlObj.pathname.replace(/\/$/, '');
}
