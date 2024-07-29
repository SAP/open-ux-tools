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
