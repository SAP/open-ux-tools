import { Severity } from '@sap-devx/yeoman-ui-types';
import { SystemInfo, AdaptationProjectType } from '@sap-ux/axios-extension';

import { FlexUISupportedSystem } from '../../../../types';
import { t } from '../../../../i18n';

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
