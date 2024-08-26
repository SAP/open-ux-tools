import { Severity } from '@sap-devx/yeoman-ui-types';
import type { SystemInfo } from '@sap-ux/axios-extension';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

import { t } from '../../../../i18n';
import type ConfigInfoPrompter from '../config';
import type { Application, ConfigurationInfoAnswers, FlexUISupportedSystem } from '../../../../types';

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

/**
 * Provides additional messages related to the application based on its support and sync status.
 *
 * @param {Application} app - The application object.
 * @param {ConfigInfoPrompter} prompter - The prompter instance managing and providing system and application state information.
 * @returns {object | undefined} An object containing a message and its severity level, or undefined if no message is necessary.
 */
export const appAdditionalMessages = (app: Application, prompter: ConfigInfoPrompter): object | undefined => {
    if (!app) {
        return undefined;
    }

    if (prompter.appIdentifier.appSync && prompter.isApplicationSupported) {
        return {
            message: t('prompts.appInfoLabel'),
            severity: Severity.information
        };
    }

    const isSupported = prompter.appIdentifier.getIsSupported();
    const isPartiallySupported = prompter.appIdentifier.getIsPartiallySupported();

    if (!isSupported && !isPartiallySupported && prompter.isApplicationSupported) {
        return {
            message: t('prompts.notSupportedAdpOverAdpLabel'),
            severity: Severity.warning
        };
    }

    if (isPartiallySupported && prompter.isApplicationSupported) {
        return {
            message: t('prompts.isPartiallySupportedAdpOverAdpLabel'),
            severity: Severity.warning
        };
    }

    if (prompter.appIdentifier.isV4AppInternalMode) {
        return {
            message: t('prompts.v4AppNotOfficialLabel'),
            severity: Severity.warning
        };
    }
};

/**
 * Provides additional messages related to UI5 version detection based on system and authentication conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The configuration answers that include system-specific details and user credentials.
 * @param {ConfigInfoPrompter} prompter - The prompter instance managing system authentication and project configurations.
 * @returns {object | undefined} An object containing a message and its severity level if conditions are met; otherwise, undefined.
 */
export const versionAdditionalMessages = (
    answers: ConfigurationInfoAnswers,
    prompter: ConfigInfoPrompter
): object | undefined => {
    if (
        !prompter.shouldAuthenticate(answers) &&
        !prompter.ui5VersionDetected &&
        !prompter.isCloudProject &&
        (prompter.hasSystemAuthentication ? prompter.isLoginSuccessfull : true)
    ) {
        return {
            message: t('validators.ui5VersionNotDetectedError'),
            severity: Severity.warning
        };
    }
};

/**
 * Provides additional messages related to project type, particularly regarding the UI5 version in cloud projects.
 *
 * @param {ConfigurationInfoAnswers} answers - The configuration answers that include system-specific details.
 * @param {ConfigInfoPrompter} prompter - The prompter instance that contains system and project configuration details.
 * @returns {object | undefined} An object containing a message and its severity level, tailored to the project type and current settings.
 */
export const projectTypeAdditionalMessages = (
    answers: ConfigurationInfoAnswers,
    prompter: ConfigInfoPrompter
): object | undefined => {
    if (answers?.system && !prompter.shouldAuthenticate(answers) && prompter.isCloudProject) {
        return {
            message: t('prompts.currentUI5VersionLabel', { version: prompter.ui5Manager.latestVersion }),
            severity: Severity.information
        };
    }
};
