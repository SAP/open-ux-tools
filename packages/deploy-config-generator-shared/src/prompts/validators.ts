import { AdaptationProjectType } from '@sap-ux/axios-extension';
import { getSystemInfo } from '../service-provider-utils';
import type { BackendTarget, SystemConfig } from '../types';
import type { Logger } from '@sap-ux/logger';
import { t } from '../utils/i18n';

/**
 * Checks if the given package is a cloud-ready package.
 *
 * - Fetches system information for the package using the provided system configuration and backend target.
 * - Validates whether the adaptation project type for the package is "CLOUD_READY".
 *
 * @param {string} input - The name of the package to validate.
 * @param {SystemConfig} systemConfig - Configuration object for the system (e.g., URL, client, destination).
 * @param {Logger} logger - Logger instance.
 * @param {BackendTarget} [backendTarget] - Optional backend target for further system validation.
 * @returns {Promise<boolean>} - Resolves to `true` if the package is cloud-ready, `false` otherwise.
 */
export async function isCloudPackage(
    input: string,
    systemConfig: SystemConfig,
    logger: Logger,
    backendTarget?: BackendTarget
): Promise<boolean | string> {
    const systemInfo = await getSystemInfo(input, systemConfig, logger, backendTarget);
    const isCloudPackage =
        systemInfo != undefined &&
        systemInfo.adaptationProjectTypes.length === 1 &&
        systemInfo.adaptationProjectTypes[0] === AdaptationProjectType.CLOUD_READY;
    return isCloudPackage ? true : t('errors.invalidCloudPackage');
}
