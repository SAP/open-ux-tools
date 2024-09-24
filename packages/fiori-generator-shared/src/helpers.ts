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
 * Generates a variant management script in preview mode.
 *
 * @param {string} sapClient - The SAP client parameter to include in the URL. If not provided, the URL will not include the `sap-client` parameter.
 * @returns {string} A variant management script to run the application in preview mode.
 */
export function getVariantPreviewAppScript(sapClient?: string): string {
    const previewAppAnchor = '#preview-app';
    const disableCacheParam = 'sap-ui-xx-viewCache=false';
    const sapClientParam = sapClient ? `&sap-client=${sapClient}` : '';
    const urlParam = `?${[
        sapClientParam,
        disableCacheParam,
        'fiori-tools-rta-mode=true',
        'sap-ui-rta-skip-flex-validation=true'
    ]
        .filter(Boolean)
        .join('&')}`;
    return `fiori run --open \"preview.html${urlParam}${previewAppAnchor}\"`;
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
