import { ListPackageService } from '@sap-ux/axios-extension';
import { getOrCreateServiceProvider } from './abap-service-provider';
import { ABAP_PACKAGE_SEARCH_MAX_RESULTS } from '../constants';
import { t } from '../i18n';
import LoggerHelper from '../logger-helper';
import type { AbapDeployConfigPromptOptions, SystemConfig } from '../types';

/**
 * List packages from the service.
 *
 * @param phrase - search phrase
 * @param options - abap deploy config prompt options
 * @param systemConfig - system configuration
 * @returns list of packages
 */
export async function listPackagesFromService(
    phrase: string,
    options: AbapDeployConfigPromptOptions,
    systemConfig: SystemConfig
): Promise<string[]> {
    try {
        const provider = await getOrCreateServiceProvider(options, systemConfig);
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
