import { readdirSync } from 'fs';
import type { UI5VersionManager } from '../../../../common';
import type { ManifestManager } from '../../../../client';
import type { ConfigurationInfoAnswers } from '../../../../types';
import type ConfigInfoPrompter from '../config';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

const APP_VARIANT_REGEX = /^app[.]variant\d{1,3}$/;

/**
 * Generates a namespace for a project based on its layer.
 *
 * @param {string} projectName - The name of the project.
 * @param {boolean} isCustomerBase - Flag indicating whether the project is for a customer base layer.
 * @returns {string} The namespace string, prefixed appropriately if it's a customer base project.
 */
export function generateValidNamespace(projectName: string, isCustomerBase: boolean): string {
    return !isCustomerBase ? projectName : 'customer.' + projectName;
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
        .sort((a, b) => a.localeCompare(b))
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

/**
 * Gets the default UI5 version from the system versions list by validating the first available version.
 * If the first version is valid according to the UI5 service, it returns that version; otherwise, returns an empty string.
 *
 * @param {string[]} versionsOnSystem Array of available versions.
 * @param {UI5VersionManager} ui5Manager An instance of UI5VersionManager.
 * @returns {Promise<string>} The valid UI5 version or an empty string if the first version is not valid or if there are no versions.
 */
export async function getVersionDefaultValue(
    versionsOnSystem: string[],
    ui5Manager: UI5VersionManager
): Promise<string> {
    if (!versionsOnSystem || versionsOnSystem.length === 0) {
        return '';
    }

    const isValid = (await ui5Manager.validateUI5Version(versionsOnSystem[0])) === true;
    return isValid ? versionsOnSystem[0] : '';
}

/**
 * Retrieves the default Fiori ID from the application's manifest.
 *
 * @param {ConfigurationInfoAnswers} answers - The configuration answers containing details about the application.
 * @param {ManifestManager} manifestManager - The manager responsible for fetching and handling the application manifest.
 * @returns {Promise<string>} The Fiori registration IDs as a string if available, otherwise an empty string.
 */
export async function getDefaultFioriId(
    answers: ConfigurationInfoAnswers,
    manifestManager: ManifestManager
): Promise<string> {
    const manifest = await manifestManager.getManifest(answers?.application?.id);
    return manifest?.['sap.fiori']?.registrationIds?.toString() ?? '';
}

/**
 * Retrieves the default Application Component Hierarchy (ACH) from the application's manifest.
 *
 * @param {ConfigurationInfoAnswers} answers - The configuration answers that include application details.
 * @param {ManifestManager} manifestManager - The manager responsible for accessing the application manifest.
 * @returns {Promise<string>} The ACH code as a string if available, otherwise an empty string.
 */
export async function getDefaultAch(
    answers: ConfigurationInfoAnswers,
    manifestManager: ManifestManager
): Promise<string> {
    const manifest = await manifestManager.getManifest(answers?.application?.id);
    return manifest?.['sap.app']?.ach?.toString() ?? '';
}

/**
 * Determines the default project type based on available adaptation project types from system information.
 *
 * @param {ConfigInfoPrompter} prompter - The prompter instance containing system and project information.
 * @returns {string} The default project type, favoring 'onPremise' if available, otherwise the first listed type.
 */
export function getDefaultProjectType(prompter: ConfigInfoPrompter): string {
    return prompter.systemInfo.adaptationProjectTypes.includes(AdaptationProjectType.ON_PREMISE)
        ? AdaptationProjectType.ON_PREMISE
        : prompter.systemInfo.adaptationProjectTypes[0];
}
