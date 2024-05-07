import path from 'path';

/**
 * Returns the URI path for the CAP app.
 *
 * @param {string} projectName - The name of the project.
 * @param {string} appId - The ID of the app.
 * @param {boolean} [useNPMWorkspaces] - Whether to use npm workspaces.
 * @returns {string} The URI path for the CAP app.
 */
function getCAPAppUriPath(projectName: string, appId: string, useNPMWorkspaces: boolean = false): string {
    // projects by default are served base on the folder name in the app/ folder
    // If the project uses npm workspaces (and specifically cds-plugin-ui5 ) then the project is served using the appId including namespace
    return useNPMWorkspaces ? appId : projectName + '/webapp';
}

/**
 * Retrieves the CDS task for the CAP app.
 *
 * @param {string} projectName - The name of the project.
 * @param {string} appId - The ID of the app.
 * @param {boolean} [useNPMWorkspaces] - Whether to use npm workspaces.
 * @returns {{ [x: string]: string }} The CDS task for the CAP app.
 */
export function getCDSTask(
    projectName: string,
    appId: string,
    useNPMWorkspaces: boolean = false
): { [x: string]: string } {
    const DisableCacheParam = 'sap-ui-xx-viewCache=false';
    return {
        [`watch-${projectName}`]: `cds watch --open ${getCAPAppUriPath(
            projectName,
            appId,
            useNPMWorkspaces
        )}/index.html?${DisableCacheParam}${useNPMWorkspaces ? ' --livereload false' : ''}`
    };
}

/**
 * Converts a directory path to a POSIX-style path.
 * This function is temporary and should be removed once a common utility library package is available.
 *
 * @param {string} dirPath - The directory path to be converted.
 * @returns {string} The converted POSIX-style path.
 */
export function toPosixPath(dirPath: string): string {
    return path.normalize(dirPath).split(/[\\/]/g).join(path.posix.sep);
}
