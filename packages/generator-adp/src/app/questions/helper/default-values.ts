import { validateUI5VersionExists, getDefaultProjectName } from '@sap-ux/adp-tooling';

export { getDefaultProjectName } from '@sap-ux/adp-tooling';

/**
 * Generates a namespace for a project based on its layer.
 *
 * @param {string} projectName - The name of the project.
 * @param {FlexLayer} isCustomerBase - Indicates the deployment layer (e.g., CUSTOMER_BASE).
 * @returns {string} The namespace string, prefixed appropriately if it's a customer base project.
 */
export function getDefaultNamespace(projectName: string, isCustomerBase: boolean): string {
    return isCustomerBase ? `customer.${projectName}` : projectName;
}

/**
 * Gets the default UI5 version from the system versions list by validating the first available version.
 * If the first version is valid according to the UI5 service, it returns that version; otherwise, returns an empty string.
 *
 * @param {string[]} ui5Versions Array of available versions.
 * @returns {Promise<string>} The valid UI5 version or an empty string if the first version is not valid or if there are no versions.
 */
export async function getDefaultVersion(ui5Versions: string[]): Promise<string> {
    if (ui5Versions?.length === 0) {
        return '';
    }

    const isValid = await validateUI5VersionExists(ui5Versions[0]);
    return isValid === true ? ui5Versions[0] : '';
}
