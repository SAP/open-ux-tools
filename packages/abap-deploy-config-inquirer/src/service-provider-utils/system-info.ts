import type { SystemInfo } from '@sap-ux/axios-extension';
import { getOrCreateServiceProvider } from './abap-service-provider';
import type { BackendTarget, SystemConfig } from '../types';
import LoggerHelper from '../logger-helper';
import { t } from '../i18n';

/**
 * Fetches system information for a specified package from an ABAP system.
 *
 * @param {string} packageName - The name of the package for which to retrieve system information.
 * @param {SystemConfig} systemConfig - Configuration details of the ABAP system.
 * @param {BackendTarget} [backendTarget] - Optional backend target information.
 * @returns {Promise<SystemInfo | undefined>} A promise resolving to the system information if successful,
 * or `undefined` if an error occurs.
 */
export async function getSystemInfo(
    packageName: string,
    systemConfig: SystemConfig,
    backendTarget?: BackendTarget
): Promise<SystemInfo | undefined> {
    try {
        const provider = await getOrCreateServiceProvider(systemConfig, backendTarget);
        const lrep = provider.getLayeredRepository();

        return lrep.getSystemInfo(packageName);
    } catch (e) {
        LoggerHelper.logger.debug(t('errors.debugAbapTargetSystem', { method: 'getSystemInfo', error: e.message }));
        return undefined;
    }
}
