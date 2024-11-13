import { gte } from 'semver';
import { type UI5 } from './types';

export const ui5LtsVersion_1_71 = '1.71.0';
export const ui5LtsVersion_1_120 = '1.120.0';

/**
 * Compares two UI5 versions to determine if the first is greater than or equal to the second.
 *
 * @param {string} ui5VersionA - The first UI5 version to compare.
 * @param {string} ui5VersionB - The second UI5 version to compare.
 * @returns {boolean} - True if the first version is greater than or equal to the second, false otherwise.
 */
export function compareUI5VersionGte(ui5VersionA: string, ui5VersionB: string): boolean {
    if (ui5VersionA === '') {
        // latest version
        return true;
    } else {
        return gte(ui5VersionA, ui5VersionB, { loose: true });
    }
}

/**
 * Gets the template version path based on the UI5 version and template type.
 *
 * @param {UI5} ui5 - The UI5 configuration.
 * @returns {string} - The template version path.
 */
export function getTemplateVersionPath(ui5: UI5): string {
    let templateVersionPath = '';
    const ui5Version = ui5?.minUI5Version ?? ui5?.version ?? '';
    if (ui5Version && compareUI5VersionGte(ui5Version, ui5LtsVersion_1_120)) {
        templateVersionPath = ui5LtsVersion_1_120;
    } else {
        templateVersionPath = ui5LtsVersion_1_71;
    }

    return templateVersionPath;
}

/**
 * Processes the destination path by removing specific version segments.
 *
 * @param {string} filePath - The file path to process.
 * @returns {string} - The processed file path.
 */
export function processDestinationPath(filePath: string): string {
    return filePath.replace(`/${ui5LtsVersion_1_120}`, '').replace(`/${ui5LtsVersion_1_71}`, '').replace('/common', '');
}
