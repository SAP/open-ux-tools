import { Severity } from '@sap-devx/yeoman-ui-types';
import type { SystemInfo } from '@sap-ux/axios-extension';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

import { t } from '../../i18n';
import type { FlexUISupportedSystem } from '../../types';
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
    const emptyErrorMsg = t('validators.inputCannotBeEmpty');
    const lenghtErrorMsg = t(`validators.projectNameLengthError${baseType}`);
    const validationErrorMsg = t(`validators.projectNameValidationError${baseType}`);
    return `${emptyErrorMsg} ${lenghtErrorMsg} ${validationErrorMsg}`;
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
            description: t('prompts.basicInfoDescr')
        },
        { name: 'Configuration', description: t('prompts.configureInfoDescr') }
    ];
}

/**
 * Evaluates a system's deployment and flexibility capabilities to generate relevant messages based on the system's characteristics.
 *
 * @param {FlexUISupportedSystem | undefined} flexUISystem - An optional object containing flags indicating if the system
 *                                                           is on-premise and whether UI Flex is enabled.
 * @param {SystemInfo} systemInfo - An object containing information about the system, particularly the types of adaptation
 *                                  projects supported by the system.
 * @returns {{message: string, severity: Severity} | undefined} An object containing a message and its severity level.
 */
export const systemAdditionalMessages = (
    flexUISystem: FlexUISupportedSystem | undefined,
    systemInfo: SystemInfo
): { message: string; severity: Severity } | undefined => {
    const isOnPremise = flexUISystem?.isOnPremise;
    const isUIFlex = flexUISystem?.isUIFlex;
    const projectTypes = systemInfo?.adaptationProjectTypes || [];

    if (!projectTypes.length) {
        return;
    }

    let isCloudProject: boolean | undefined;
    if (projectTypes.length === 1) {
        if (projectTypes[0] === AdaptationProjectType.CLOUD_READY) {
            isCloudProject = true;
        }
        if (projectTypes[0] === AdaptationProjectType.ON_PREMISE) {
            isCloudProject = false;
        }
    } else if (projectTypes.length > 1) {
        isCloudProject = false;
    }

    if (isCloudProject) {
        return;
    }

    if (!isOnPremise) {
        if (!isUIFlex) {
            return {
                message: t('validators.notDeployableNotFlexEnabledSystemError'),
                severity: Severity.error
            };
        } else {
            return {
                message: t('validators.notDeployableSystemError'),
                severity: Severity.error
            };
        }
    }

    if (isOnPremise && !isUIFlex) {
        return {
            message: t('validators.notFlexEnabledError'),
            severity: Severity.warning
        };
    }
};
