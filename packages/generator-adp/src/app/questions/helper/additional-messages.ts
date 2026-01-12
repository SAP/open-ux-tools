import { Severity } from '@sap-devx/yeoman-ui-types';
import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';

import { AdaptationProjectType } from '@sap-ux/axios-extension';
import type { AdaptationDescriptor } from '@sap-ux/axios-extension';
import type { FlexUISupportedSystem, SourceApplication } from '@sap-ux/adp-tooling';

import { t } from '../../../utils/i18n';
import { DEFAULT_ADAPTATION_ID } from '../key-user';

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

    if (!flexUISystem) {
        return undefined;
    }

    if (!isOnPremise) {
        if (!isUIFlex) {
            return {
                message: t('error.notDeployableNotFlexEnabledSystemError'),
                severity: Severity.warning
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

/**
 * Provides additional messages for key-user prompts (system or password).
 *
 * @param {object} options - The options for the key-user additional messages.
 * @param {AdaptationDescriptor[]} options.adaptations - The list of adaptations available.
 * @param {boolean} options.isAuthRequired - Whether authentication is required.
 * @param {number} options.keyUserChangesCount - The number of key-user changes found.
 * @param {boolean} options.isSystemPrompt - Whether this is for the system prompt (true) or password prompt (false).
 * @returns {IMessageSeverity | undefined} Message object or undefined if no message is applicable.
 */
export const getKeyUserSystemAdditionalMessages = ({
    adaptations,
    isAuthRequired,
    keyUserChangesCount,
    isSystemPrompt
}: {
    adaptations: AdaptationDescriptor[];
    isAuthRequired: boolean;
    keyUserChangesCount: number;
    isSystemPrompt: boolean;
}): IMessageSeverity | undefined => {
    const hasOnlyDefaultAdaptation = adaptations.length === 1 && adaptations[0]?.id === DEFAULT_ADAPTATION_ID;
    const authMatches = isSystemPrompt ? !isAuthRequired : isAuthRequired;

    if (authMatches) {
        if (adaptations.length > 1) {
            return {
                message: t('prompts.keyUserAdaptationLabelMulti'),
                severity: Severity.information
            };
        }
        if (hasOnlyDefaultAdaptation && keyUserChangesCount > 0) {
            return {
                message: t('prompts.keyUserChangesFoundAdaptation', { adaptationId: DEFAULT_ADAPTATION_ID }),
                severity: Severity.information
            };
        }
    }

    return undefined;
};

/**
 * Provides additional messages for the key-user adaptation prompt.
 *
 * @param {AdaptationDescriptor | null} adaptation - The selected adaptation, or null if not selected.
 * @param {number} keyUserChangesCount - The number of key-user changes found.
 * @returns {IMessageSeverity | undefined} Message object or undefined if no message is applicable.
 */
export const getKeyUserAdaptationAdditionalMessages = (
    adaptation: AdaptationDescriptor | null,
    keyUserChangesCount: number
): IMessageSeverity | undefined => {
    if (adaptation && keyUserChangesCount > 0) {
        return {
            message: t('prompts.keyUserChangesFoundAdaptation', {
                adaptationId: adaptation.title ?? adaptation.id
            }),
            severity: Severity.information
        };
    }
    return undefined;
};
