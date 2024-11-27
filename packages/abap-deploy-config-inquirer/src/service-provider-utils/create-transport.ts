import { TransportRequestService } from '@sap-ux/axios-extension';
import { t } from '../i18n';
import LoggerHelper from '../logger-helper';
import type { NewUi5ObjectRequestParams } from '@sap-ux/axios-extension';
import {
    getOrCreateServiceProvider,
    type BackendTarget,
    type SystemConfig
} from '@sap-ux/deploy-config-generator-shared';

/**
 * Create a transport number from the service.
 *
 * @param createTransportParams - input parameters for creating a new transport request for an UI5 app object
 * @param systemConfig - system configuration
 * @param backendTarget - backend target
 * @returns transport number if created successfully, otherwise undefined
 */
export async function createTransportNumberFromService(
    createTransportParams: NewUi5ObjectRequestParams,
    systemConfig: SystemConfig,
    backendTarget?: BackendTarget
): Promise<string | undefined> {
    let transportReqNumber: string | undefined;
    try {
        const provider = await getOrCreateServiceProvider(systemConfig, LoggerHelper.logger, backendTarget);
        const adtService = await provider.getAdtService<TransportRequestService>(TransportRequestService);
        if (adtService) {
            transportReqNumber = await adtService.createTransportRequest(createTransportParams);
        }
    } catch (e) {
        LoggerHelper.logger.debug(
            t('errors.debugAbapTargetSystem', { method: 'createTransportNumberFromService', error: e.message })
        );
        return undefined;
    }
    return transportReqNumber;
}
