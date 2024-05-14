import path from 'path';

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
    // projects by default are served base on the folder name in the app/ folder
    // If the project uses npm workspaces (and specifically cds-plugin-ui5 ) then the project is served using the appId including namespace
    const project = useNPMWorkspaces ? appId : projectName + '/webapp';
    return {
        [`watch-${projectName}`]: `cds watch --open ${project}/index.html?${DisableCacheParam}${
            useNPMWorkspaces ? ' --livereload false' : ''
        }`
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

/**
 * Get the path to the annotations file for a project.
 *
 * @param projectName The name of the project.
 * @param appPath path to the application
 * @returns {string} The path to the annotations file.
 */
export function getAnnotationPath(projectName: string, appPath = 'app'): string {
    return path.join(appPath, projectName, 'annotation.cds').replace(/\\/g, '/');
}
