import { isAxiosError } from '@sap-ux/axios-extension';
import { AbapServiceProviderManager } from './abap-service-provider';
import type { BackendTarget, SystemInfoResult } from '../types';
import LoggerHelper from '../logger-helper';
import { t } from '../i18n';

/**
 * Fetches system information for a specified package from an ABAP system.
 *
 * @param {string} packageName - The name of the package for which to retrieve system information.
 * @param {BackendTarget} [backendTarget] - Optional backend target information.
 * @returns {Promise<SystemInfoResult>} A promise resolving to the system information if successful,
 * or `undefined` if an error occurs.
 */
export async function getSystemInfo(packageName: string, backendTarget?: BackendTarget): Promise<SystemInfoResult> {
    const result: SystemInfoResult = {
        apiExist: true
    };
    try {
        const provider = await AbapServiceProviderManager.getOrCreateServiceProvider(backendTarget);
        const lrep = provider.getLayeredRepository();
        const systemInfo = await lrep.getSystemInfo(undefined, packageName);
        result.systemInfo = systemInfo;
        return result;
    } catch (e) {
        LoggerHelper.logger.debug(t('errors.debugAbapTargetSystem', { method: 'getSystemInfo', error: e.message }));
        if (isAxiosError(e) && e?.response?.status === 405) {
            result.apiExist = false;
        }
        return result;
    }
}
