import { TransportChecksService } from '@sap-ux/axios-extension';
import { t } from '../i18n';
import { getOrCreateServiceProvider } from './abap-service-provider';
import type { AbapDeployConfigPromptOptions, SystemConfig, TransportListItem } from '../types';
import LoggerHelper from '../logger-helper';

/**
 * Get the transport list from the service.
 *
 * @param packageName - package name
 * @param appName - app name
 * @param options - abap deploy config prompt options
 * @param systemConfig - system configuration
 * @returns list of transport numbers.
 */
export async function getTransportListFromService(
    packageName: string,
    appName: string,
    options: AbapDeployConfigPromptOptions,
    systemConfig: SystemConfig
): Promise<TransportListItem[] | undefined> {
    let transportListItems: TransportListItem[] | undefined;
    try {
        const provider = await getOrCreateServiceProvider(options, systemConfig);
        const adtService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        const transportReqList = await adtService?.getTransportRequests(packageName, appName);

        if (transportReqList) {
            transportListItems = transportReqList.map((transportReq) => {
                return {
                    transportReqNumber: transportReq.transportNumber,
                    transportReqDescription: transportReq.description
                };
            });
        }
    } catch (e) {
        LoggerHelper.logger.debug(
            t('errors.debugAbapTargetSystem', { method: 'getTransportListFromService', error: e.message })
        );
        return undefined;
    }
    return transportListItems;
}

export const transportName = (transport: TransportListItem) => {
    const name = transport.transportReqDescription
        ? `${transport.transportReqNumber} (${transport.transportReqDescription})`
        : `${transport.transportReqNumber}`;
    return {
        name,
        value: transport.transportReqNumber
    };
};
