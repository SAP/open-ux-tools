import type { ResultMessage, SapSystem, SapSystemResults } from '../types';
import { getLogger } from '../logger';
import { isAppStudio } from '@sap-ux/btp-utils';
import {
    AbapCloudEnvironment,
    createForAbap,
    createForAbapOnCloud,
    createForDestination
} from '@sap-ux/axios-extension';
import { checkBASDestination, checkBASDestinations } from './destination';
import { checkStoredSystem, checkStoredSystems } from './stored-system';
import { checkCatalogServices } from './helpers';
import { t } from '../i18n';
import type { AxiosRequestConfig } from 'axios';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

/**
 * Internal function to create a service provider.
 *
 * @param sapSystem - the SAP system
 * @returns - ABAP service provider
 */
function getServiceProvider(sapSystem: SapSystem): AbapServiceProvider {
    let abapServiceProvider: AbapServiceProvider;

    if (isAppStudio()) {
        const username = sapSystem.Credentials?.username;
        const password = sapSystem.Credentials?.password;
        const auth =
            username !== undefined && password !== undefined
                ? {
                      username,
                      password
                  }
                : undefined;

        const axiosConfig: AxiosRequestConfig = {
            baseURL: sapSystem.Host,
            auth: auth
        };

        abapServiceProvider = createForDestination(axiosConfig, { Name: sapSystem.Name }) as AbapServiceProvider;
    } else if (sapSystem.Scp) {
        // btp service provier if scp is true
        abapServiceProvider = createForAbapOnCloud({
            refreshToken: (sapSystem as any).credentials?.refreshToken,
            environment: AbapCloudEnvironment.Standalone,
            service: (sapSystem as any).credentials?.serviceKeysContents
        });
    } else {
        // abap on-premise
        abapServiceProvider = createForAbap({
            baseURL: sapSystem.Url,
            ignoreCertErrors: true,
            auth: {
                username: sapSystem.Credentials?.username,
                password: sapSystem.Credentials?.password
            }
        });
    }
    return abapServiceProvider;
}

/**
 * Checks the SAP systems and returns a list.
 *
 * @returns messages, SAP systems
 */
export async function checkSapSystems(): Promise<{
    messages: ResultMessage[];
    sapSystems: SapSystem[];
}> {
    const logger = getLogger();
    let sapSystems: SapSystem[] = [];

    if (isAppStudio()) {
        const { messages: basDestMsgs, destinations } = await checkBASDestinations();
        sapSystems = destinations;
        logger.push(...basDestMsgs);
    } else {
        const { messages: storedSysMsgs, storedSystems } = await checkStoredSystems();
        sapSystems = storedSystems;
        logger.push(...storedSysMsgs);
    }

    return {
        messages: logger.getMessages(),
        sapSystems: sapSystems
    };
}

/**
 * Check a SAP system for information including results of v2 & v4 catalog service requests.
 *
 * @param sapSystem - SAP system from list of all systems
 * @returns messages and sapSystem results
 */
export async function checkSapSystem(
    sapSystem: SapSystem
): Promise<{ messages: ResultMessage[]; sapSystemResults: SapSystemResults }> {
    const logger = getLogger();
    logger.info(t('info.checkingSapSystem', { sapSystem: sapSystem.Name }));
    let destinationResults: SapSystemResults;
    let storedSystemResults: SapSystemResults;

    const abapServiceProvider = getServiceProvider(sapSystem);

    // catalog service request
    const { messages: catalogMsgs, result: catalogServiceResult } = await checkCatalogServices(
        abapServiceProvider,
        sapSystem.Name
    );
    logger.push(...catalogMsgs);

    if (isAppStudio()) {
        const checkBASDestinationResult = await checkBASDestination(sapSystem);
        destinationResults = checkBASDestinationResult.destinationResults;
        logger.push(...checkBASDestinationResult.messages);
    } else {
        const checkStoredSystemResult = await checkStoredSystem(abapServiceProvider);
        storedSystemResults = checkStoredSystemResult.storedSystemResults;
        logger.push(...checkStoredSystemResult.messages);
    }

    const sapSystemResults: SapSystemResults = {
        catalogService: catalogServiceResult,
        ...destinationResults,
        ...storedSystemResults
    };

    return {
        messages: logger.getMessages(),
        sapSystemResults
    };
}
