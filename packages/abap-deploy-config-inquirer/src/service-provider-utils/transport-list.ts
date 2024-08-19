import { TransportChecksService } from '@sap-ux/axios-extension';
import { t } from '../i18n';
import { getOrCreateServiceProvider } from './abap-service-provider';
import type { BackendTarget, SystemConfig, TransportListItem } from '../types';
import LoggerHelper from '../logger-helper';
import { PromptState } from '../prompts/prompt-state';

/**
 * Get the transport list from the service.
 *
 * @param packageName - package name
 * @param appName - app name
 * @param systemConfig - system configuration
 * @param backendTarget - backend target
 * @returns list of transport numbers.
 */
export async function getTransportListFromService(
    packageName: string,
    appName: string,
    systemConfig: SystemConfig,
    backendTarget?: BackendTarget
): Promise<TransportListItem[] | undefined> {
    let transportListItems: TransportListItem[] | undefined;
    try {
        const provider = await getOrCreateServiceProvider(systemConfig, backendTarget);
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
        if (e.message === TransportChecksService.LocalPackageError) {
            PromptState.transportAnswers.transportRequired = false;
        }
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
