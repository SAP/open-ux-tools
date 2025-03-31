import { Severity } from '@sap-devx/yeoman-ui-types';

import { AdaptationProjectType } from '@sap-ux/axios-extension';
import type { FlexUISupportedSystem, TargetApplication } from '@sap-ux/adp-tooling';

import { t } from '../../../utils/i18n';
import type { AppIdentifier } from '../../app-identifier';

/**
 * Evaluates a system's deployment and flexibility capabilities to generate relevant messages based on the system's characteristics.
 *
 * @param {FlexUISupportedSystem | undefined} flexUISystem - An optional object containing flags indicating if the system
 *                                                           is on-premise and whether UI Flex is enabled.
 * @param isCloudProject
 * @returns {{message: string, severity: Severity} | undefined} An object containing a message and its severity level.
 */
export const systemAdditionalMessages = (
    flexUISystem: FlexUISupportedSystem | undefined,
    isCloudProject: boolean
): { message: string; severity: Severity } | undefined => {
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
 * Provides additional messages related to the application based on its support and sync status.
 *
 * @param {Application} app - The application object.
 * @param appIdentifier
 * @param isApplicationSupported
 * @returns {object | undefined} An object containing a message and its severity level, or undefined if no message is necessary.
 */
export const appAdditionalMessages = (
    app: TargetApplication,
    appIdentifier: AppIdentifier,
    isApplicationSupported: boolean
): { message: string; severity: Severity } | undefined => {
    if (!app) {
        return undefined;
    }

    if (appIdentifier.appSync && isApplicationSupported) {
        return {
            message: t('prompts.appInfoLabel'),
            severity: Severity.information
        };
    }

    const isSupported = appIdentifier.getIsSupported();
    const isPartiallySupported = appIdentifier.getIsPartiallySupported();

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

    if (appIdentifier.v4AppInternalMode) {
        return {
            message: t('prompts.v4AppNotOfficialLabel'),
            severity: Severity.warning
        };
    }
};
