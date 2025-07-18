import { t } from '../i18n';
import LoggerHelper from '../logger-helper';
import { type BackendTarget } from '../types';
import { AbapServiceProviderManager } from './abap-service-provider';

/**
 * Determines if the specified backend target is an ABAP Cloud system.
 *
 * @param backendTarget - backend target configuration.
 * @returns if the backend target is an ABAP Cloud system or undefined if an error occurs.
 */
export async function isAbapCloud(backendTarget?: BackendTarget): Promise<boolean | undefined> {
    try {
        const provider = await AbapServiceProviderManager.getOrCreateServiceProvider(backendTarget);
        const isAbapCloud = await provider.isAbapCloud();
        return isAbapCloud;
    } catch (e) {
        LoggerHelper.logger.debug(t('errors.debugAbapTargetSystem', { method: 'isAbapCloud', error: e.message }));
        return undefined;
    }
}
