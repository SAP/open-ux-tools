import { Severity } from '@sap-devx/yeoman-ui-types';
import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';

import { AdaptationProjectType } from '@sap-ux/axios-extension';
import type { FlexUICapability, SourceApplication } from '@sap-ux/adp-tooling';

import { t } from '../../../utils/i18n';

interface SupportFlags {
    hasSyncViews: boolean;
    isV4AppInternalMode: boolean;
    isSupported: boolean;
    isPartiallySupported: boolean;
}

/**
 * Evaluates a system's deployment and flexibility capabilities to generate relevant messages based on the system's characteristics.
 *
 * @param {FlexUICapability | undefined} flexUICapability - An optional object containing flags indicating if the system
 *                                                           is on-premise and whether UI Flex is enabled.
 * @param {AdaptationProjectType|undefined} projectType - The project type.
 * @returns {IMessageSeverity | undefined} An object containing a message and its severity level.
 */
export const getSystemAdditionalMessages = (
    flexUICapability?: FlexUICapability,
    projectType?: AdaptationProjectType
): IMessageSeverity | undefined => {
    if (!flexUICapability || !projectType) {
        return undefined;
    }

    if (projectType === AdaptationProjectType.CLOUD_READY) {
        return {
            message: `${t('prompts.projectTypeLabel')}: ${AdaptationProjectType.CLOUD_READY}`,
            severity: Severity.information
        };
    }

    const { isDtaFolderDeploymentSupported, isUIFlexSupported } = flexUICapability;

    if (isUIFlexSupported) {
        return isDtaFolderDeploymentSupported
            ? {
                  message: `${t('prompts.projectTypeLabel')}: ${AdaptationProjectType.ON_PREMISE}`,
                  severity: Severity.information
              }
            : {
                  message: t('error.notDeployableSystemError'),
                  severity: Severity.error
              };
    }

    return isDtaFolderDeploymentSupported
        ? {
              message: t('error.notFlexEnabledError'),
              severity: Severity.warning
          }
        : {
              message: t('error.notDeployableNotFlexEnabledSystemError'),
              severity: Severity.warning
          };
};

/**
 * Provides an additional contextual message for the selected application, based on its compatibility,
 * feature support, or sync-loading behavior.
 *
 * @param {SourceApplication} app - The selected application object.
 * @param {SupportFlags} flags - Flags indicating support for sync views, Adp-over-Adp, and V4 internal apps.
 * @param {boolean} isApplicationSupported - Indicates whether the application is supported at all.
 * @returns {IMessageSeverity | undefined} Message object or undefined if no message is applicable.
 */
export const getAppAdditionalMessages = (
    app: SourceApplication,
    { hasSyncViews, isSupported, isPartiallySupported, isV4AppInternalMode }: SupportFlags,
    isApplicationSupported: boolean
): IMessageSeverity | undefined => {
    if (!app) {
        return undefined;
    }

    if (hasSyncViews && isApplicationSupported) {
        return {
            message: t('prompts.appInfoLabel'),
            severity: Severity.information
        };
    }

    if (!isSupported && !isPartiallySupported && isApplicationSupported) {
        return {
            message: t('prompts.notSupportedAdpOverAdpLabel'),
            severity: Severity.warning
        };
    }

    if (isPartiallySupported && isApplicationSupported) {
        return {
            message: t('prompts.isPartiallySupportedAdpOverAdpLabel'),
            severity: Severity.warning
        };
    }

    if (isV4AppInternalMode) {
        return {
            message: t('prompts.v4AppNotOfficialLabel'),
            severity: Severity.warning
        };
    }

    return undefined;
};

/**
 * Provides additional messages related to UI5 version detection based on system and authentication conditions.
 *
 * @param {boolean} isVersionDetected - Flag indicating that the system ui5 version was detected.
 * @returns {object | undefined} An object containing a message and its severity level if conditions are met; otherwise, undefined.
 */
export const getVersionAdditionalMessages = (isVersionDetected: boolean): IMessageSeverity | undefined => {
    if (!isVersionDetected) {
        return {
            message: t('validators.ui5VersionNotDetectedError'),
            severity: Severity.warning
        };
    }

    return undefined;
};

/**
 * Provides additional messages related to the target environment.
 *
 * @param {string} value - The selected target environment.
 * @param {boolean} isCFLoggedIn - Flag indicating whether the user is logged in to Cloud Foundry.
 * @param {any} cfConfig - The Cloud Foundry configuration.
 * @returns {IMessageSeverity | undefined} Message object or undefined if no message is applicable.
 */
export const getTargetEnvAdditionalMessages = (
    value: string,
    isCFLoggedIn: boolean,
    cfConfig: any
): IMessageSeverity | undefined => {
    if (value === 'CF' && isCFLoggedIn) {
        return {
            message: `You are logged in to Cloud Foundry: ${cfConfig.url} / ${cfConfig.org?.Name} / ${cfConfig.space?.Name}.`,
            severity: Severity.information
        };
    }

    return undefined;
};
