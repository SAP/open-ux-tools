import { join } from 'path';
import { existsSync } from 'fs';

import { validateUI5VersionExists } from '@sap-ux/adp-tooling';

const DEFAULT_PREFIX = 'app.variant';

/**
 * Generates a namespace for a project based on its layer.
 *
 * @param {string} projectName - The name of the project.
 * @param {FlexLayer} isCustomerBase - Indicates the deployment layer (e.g., CUSTOMER_BASE).
 * @returns {string} The namespace string, prefixed appropriately if it's a customer base project.
 */
export function generateValidNamespace(projectName: string, isCustomerBase: boolean): string {
    return isCustomerBase ? `customer.${projectName}` : projectName;
}

/**
 * Generates a default project name based on the existing projects in the specified directory.
 *
 * @returns {string} A default project name with an incremented index if similar projects exist.
 */
export function getDefaultProjectName(basePath: string, dirName: string = DEFAULT_PREFIX): string {
    let newDir = dirName;
    let index = 1;

    while (existsSync(join(basePath, newDir))) {
        index++;
        newDir = `${dirName}${index}`;
    }

    return newDir;
}

/**
 * Gets the default UI5 version from the system versions list by validating the first available version.
 * If the first version is valid according to the UI5 service, it returns that version; otherwise, returns an empty string.
 *
 * @param {string[]} ui5Versions Array of available versions.
 * @returns {Promise<string>} The valid UI5 version or an empty string if the first version is not valid or if there are no versions.
 */
export async function getVersionDefaultValue(ui5Versions: string[]): Promise<string> {
    if (ui5Versions?.length === 0) {
        return '';
    }

    const isValid = await validateUI5VersionExists(ui5Versions[0]);
    return isValid === true ? ui5Versions[0] : '';
}
