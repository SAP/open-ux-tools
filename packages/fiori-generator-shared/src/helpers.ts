/**
 * Get the resource URLs for the UShell bootstrap and UI5 bootstrap based on project type and UI5 framework details.
 *
 * @param {boolean} isEdmxProjectType - Indicates if the project is of type Edmx or CAP.
 * @param {string} [frameworkUrl] - The URL of the UI5 framework.
 * @param {string} [version] - The version of the UI5 framework.
 * @returns {{ uShellBootstrapResourceUrl: string, uiBootsrapResourceUrl: string }} - The resource URLs for UShell bootstrap and UI bootstrap.
 */
export function getBootstrapResourceUrls(
    isEdmxProjectType: boolean,
    frameworkUrl?: string,
    version?: string
): { uShellBootstrapResourceUrl: string, uiBootsrapResourceUrl: string } {
    // Determine the resource URL for the UShell bootstrap based on the project type and framework URL availability
    const uShellBootstrapResourceUrl = isEdmxProjectType
        ? '../test-resources/sap/ushell/bootstrap/sandbox.js' // Use relative path for Edmx projects
        : frameworkUrl
            ? `${frameworkUrl}${version ? `/${version}` : ''}/test-resources/sap/ushell/bootstrap/sandbox.js` // Use framework URL and version if available
            : '../test-resources/sap/ushell/bootstrap/sandbox.js'; // Use absolute path if frameworkUrl is not available

    // Determine the resource URL for the UI5 bootstrap based on the project type and framework URL availability
    const uiBootsrapResourceUrl = isEdmxProjectType
        ? '../resources/sap-ui-core.js' // Use relative path for Edmx projects
        : frameworkUrl
            ? `${frameworkUrl}${version ? `/${version}` : ''}/resources/sap-ui-core.js` // Use framework URL and version if available
            : '../resources/sap-ui-core.js'; // Use absolute path if frameworkUrl is not available

    return { uShellBootstrapResourceUrl, uiBootsrapResourceUrl };
}
