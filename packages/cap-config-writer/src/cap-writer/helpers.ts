import path from 'path';
import { getCAPAppUriPath } from '@sap-ux/project-access';

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
