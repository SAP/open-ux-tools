import { ListPackageService } from '@sap-ux/axios-extension';
import { getOrCreateServiceProvider } from './abap-service-provider';
import { ABAP_PACKAGE_SEARCH_MAX_RESULTS } from '../constants';
import { t } from '../i18n';
import LoggerHelper from '../logger-helper';
import type { BackendTarget, SystemConfig } from '../types';

/**
 * List packages from the service.
 *
 * @param phrase - search phrase
 * @param systemConfig - system configuration
 * @param backendTarget - backend target from abap deploy config prompt options
 * @returns list of packages
 */
export async function listPackagesFromService(
    phrase: string,
    systemConfig: SystemConfig,
    backendTarget?: BackendTarget
): Promise<string[]> {
    try {
        const provider = await getOrCreateServiceProvider(systemConfig, backendTarget);
        const adtService = await provider.getAdtService<ListPackageService>(ListPackageService);
        if (adtService) {
            return await adtService.listPackages({
                maxResults: ABAP_PACKAGE_SEARCH_MAX_RESULTS,
                phrase
            });
        }
    } catch (e) {
        LoggerHelper.logger.debug(
            t('errors.debugAbapTargetSystem', { method: 'listPackagesFromService', error: e.message })
        );
    }
    return [];
}
