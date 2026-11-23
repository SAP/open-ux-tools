import { randomBytes } from 'node:crypto';

import { getDefaultProjectName, validateUI5VersionExists } from '@sap-ux/adp-tooling';

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

/**
 * Generates a unique default business solution name for the headless CF flow when the caller
 * omits one. The `solution-` prefix plus 10 hex characters stays short (the value is written into
 * the CF `sap.cloud.service` destination property) and satisfies the business-solution-name charset.
 *
 * @returns {string} A unique default business solution name, e.g. `solution-a1b2c3d4e5`.
 */
export function generateBusinessSolutionName(): string {
    return `solution-${randomBytes(5).toString('hex')}`;
}

/**
 * Derives the project (sub-module) name for the CF flow from JSON input or a default.
 *
 * @param {string} projectPath - The destination path used to derive the default project name.
 * @param {string} [requested] - The explicit project name from JSON input, when provided.
 * @returns {string} The project name.
 */
export function resolveProjectName(projectPath: string, requested?: string): string {
    return requested ?? getDefaultProjectName(projectPath);
}
