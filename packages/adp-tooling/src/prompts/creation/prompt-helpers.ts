import { t } from '../../i18n';
import { getProjectNames } from '../../base/file-system';

export interface PageLabel {
    name: string;
    description: string;
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
 * Returns a tooltip message for project name input fields, customized based on the project's user layer.
 *
 * @param {boolean} isCustomerBase - Determines if the tooltip is for a customer base project.
 * @returns {string} A tooltip message with specific validation rules.
 */
export function getProjectNameTooltip(isCustomerBase: boolean): string {
    const baseType = isCustomerBase ? 'Ext' : 'Int';
    return `${t('validators.inputCannotBeEmpty')} ${t(`validators.projectNameLengthError${baseType}`)} ${t(
        `validators.projectNameValidationError${baseType}`
    )}`;
}

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
 * Provides labels and descriptions for UI pages used in setting up an app variant.
 *
 * @returns {PageLabel[]} An array of page labels with descriptions detailing the purpose of each page.
 */
export function getUIPageLabels(): PageLabel[] {
    return [
        {
            name: 'Basic Information',
            description:
                'You are about to create a new App Variant. App Variant inherits the properties of the source application. The changes that you make will reflect only in the app variant and not in the source application.'
        },
        { name: 'Configuration', description: 'Configure the system and the application you want to use.' }
    ];
}
