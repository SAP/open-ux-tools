import { TransportChecksService } from '@sap-ux/axios-extension';
import { t } from '../i18n';
import { AbapServiceProviderManager } from './abap-service-provider';
import LoggerHelper from '../logger-helper';
import { PromptState } from '../prompts/prompt-state';
import type { BackendTarget, TransportListItem } from '../types';
import type { ListChoiceOptions } from 'inquirer';

/**
 * Get the transport list from the service.
 *
 * @param packageName - package name
 * @param appName - app name
 * @param backendTarget - backend target
 * @returns list of transport numbers.
 */
export async function getTransportListFromService(
    packageName: string,
    appName: string,
    backendTarget?: BackendTarget
): Promise<TransportListItem[] | undefined> {
    let transportListItems: TransportListItem[] | undefined;
    try {
        const provider = await AbapServiceProviderManager.getOrCreateServiceProvider(backendTarget);
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

export const transportName = (transport: TransportListItem): ListChoiceOptions => {
    const name = transport.transportReqDescription
        ? `${transport.transportReqNumber} (${transport.transportReqDescription})`
        : `${transport.transportReqNumber}`;
    return {
        name,
        value: transport.transportReqNumber
    };
};
