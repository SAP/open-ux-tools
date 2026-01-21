import type { SystemInfo } from '@sap-ux/axios-extension';
import type { BackendTarget } from '../types';
import { AbapServiceProviderManager } from './abap-service-provider';

/**
 * Fetches system information for a specified package from an ABAP system.
 *
 * @param {string | undefined} packageName - The name of the package for which to retrieve system information.
 * @param {BackendTarget} [backendTarget] - Optional backend target information.
 * @returns {Promise<SystemInfo>} A promise resolved with the system information.
 */
export async function getSystemInfo(packageName?: string, backendTarget?: BackendTarget): Promise<SystemInfo> {
    const provider = await AbapServiceProviderManager.getOrCreateServiceProvider(backendTarget);
    const lrep = provider.getLayeredRepository();
    return lrep.getSystemInfo(undefined, packageName);
}
