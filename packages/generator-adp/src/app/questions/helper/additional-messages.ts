import { Severity } from '@sap-devx/yeoman-ui-types';
import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';

import { AdaptationProjectType } from '@sap-ux/axios-extension';
import type { FlexUISupportedSystem, SourceApplication } from '@sap-ux/adp-tooling';

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
 * @param {FlexUISupportedSystem | undefined} flexUISystem - An optional object containing flags indicating if the system
 *                                                           is on-premise and whether UI Flex is enabled.
 * @param {boolean} isCloudProject - Whether the project is for a cloud-based system.
 * @returns {IMessageSeverity | undefined} An object containing a message and its severity level.
 */
export const getSystemAdditionalMessages = (
    flexUISystem: FlexUISupportedSystem | undefined,
    isCloudProject: boolean
): IMessageSeverity | undefined => {
    const isOnPremise = flexUISystem?.isOnPremise;
    const isUIFlex = flexUISystem?.isUIFlex;

    if (isCloudProject) {
        return {
            message: `${t('prompts.projectTypeLabel')}: ${AdaptationProjectType.CLOUD_READY}`,
            severity: Severity.information
        };
    }

    if (!isOnPremise) {
        if (!isUIFlex) {
            return {
                message: t('error.notDeployableNotFlexEnabledSystemError'),
                severity: Severity.error
            };
        } else {
            return {
                message: t('error.notDeployableSystemError'),
                severity: Severity.error
            };
        }
    }

    if (isOnPremise && !isUIFlex) {
        return {
            message: t('error.notFlexEnabledError'),
            severity: Severity.warning
        };
    }

    return {
        message: `${t('prompts.projectTypeLabel')}: ${AdaptationProjectType.ON_PREMISE}`,
        severity: Severity.information
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
