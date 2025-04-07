import { readdirSync } from 'fs';

import { FlexLayer } from '@sap-ux/adp-tooling';

const APP_VARIANT_REGEX = /^app[.]variant\d{1,3}$/;

/**
 * Generates a namespace for a project based on its layer.
 *
 * @param {string} projectName - The name of the project.
 * @param {FlexLayer} layer -  The UI5 Flex layer, indicating the deployment layer (e.g., CUSTOMER_BASE).
 * @returns {string} The namespace string, prefixed appropriately if it's a customer base project.
 */
export function generateValidNamespace(projectName: string, layer: FlexLayer): string {
    return layer === FlexLayer.CUSTOMER_BASE ? `customer.${projectName}` : projectName;
}

/**
 * Retrieves a list of project directory names that match a specific naming pattern from the given directory path.
 *
 * @param {string} path - The directory path from which to list project names.
 * @param {RegExp} regex - The specific naming pattern to filter by.
 * @returns {string[]} An array of project names that match the pattern /^app\.variant[0-9]{1,3}$/, sorted in reverse order.
 */
export function getProjectNames(path: string, regex: RegExp = APP_VARIANT_REGEX): string[] {
    return readdirSync(path, { withFileTypes: true })
        .filter((dirent) => !dirent.isFile() && regex.test(dirent.name))
        .map((dirent) => dirent.name)
        .sort((a, b) => {
            const numA = parseInt(a.replace('app.variant', ''), 10);
            const numB = parseInt(b.replace('app.variant', ''), 10);
            return numA - numB;
        })
        .reverse();
}
/**
 * Generates a default project name based on the existing projects in the specified directory.
 *
 * @param {string} path - The directory path where projects are located.
 * @returns {string} A default project name with an incremented index if similar projects exist.
 */
export function getDefaultProjectName(path: string): string {
    const projectNames = getProjectNames(path);
    const defaultPrefix = 'app.variant';

    if (projectNames.length === 0) {
        return `${defaultPrefix}1`;
    }

    const lastProject = projectNames[0];
    const lastProjectIdx = lastProject.replace(defaultPrefix, '');
    const newProjectIndex = parseInt(lastProjectIdx, 10) + 1;

    return `${defaultPrefix}${newProjectIndex}`;
}
