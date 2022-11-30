import { getService } from '@sap-ux/store';
import type { ResultMessage, Endpoint, EndpointResults } from '../types';
import { getLogger } from '../logger';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { t } from '../i18n';
import {
    getServiceProvider,
    checkCatalogServices,
    checkAtoCatalog,
    checkUi5AbapRepository,
    checkTransportRequests
} from './service-checks';

/**
 * Check a stored SAP system for service endpoints.
 *
 * @param storedSystem - stored system to be checked
 * @returns messages and sapSystem results
 */
export async function checkStoredSystem(storedSystem: Endpoint): Promise<{
    messages: ResultMessage[];
    storedSystemResults: EndpointResults;
}> {
    const logger = getLogger();

    const abapServiceProvider = getServiceProvider(storedSystem);

    // catalog service request
    const { messages: catalogMsgs, result: catalogServiceResult } = await checkCatalogServices(
        abapServiceProvider,
        storedSystem.Name
    );
    logger.push(...catalogMsgs);

    // ato catalog request
    const { messages: atoMsgs, isAtoCatalog: isAtoCatalogResult } = await checkAtoCatalog(abapServiceProvider);
    logger.push(...atoMsgs);

    // sap ui5 repo request
    const { messages: sapUI5RepoMsgs, isSapUi5Repo: isSapUi5RepoResult } = await checkUi5AbapRepository(
        abapServiceProvider
    );
    logger.push(...sapUI5RepoMsgs);

    // check for transport requests
    const { messages: transportReqMsgs, isTransportRequests: isTransportRequestsResult } = await checkTransportRequests(
        abapServiceProvider
    );
    logger.push(...transportReqMsgs);

    const storedSystemResults: EndpointResults = {
        catalogService: catalogServiceResult,
        isAtoCatalog: isAtoCatalogResult,
        isSapUi5Repo: isSapUi5RepoResult,
        isTransportRequests: isTransportRequestsResult
    };

    return {
        messages: logger.getMessages(),
        storedSystemResults
    };
}

/**
 * Checks the stored SAP systems and returns a list.
 *
 * @returns messages, destinations
 */
export async function checkStoredSystems(): Promise<{
    messages: ResultMessage[];
    storedSystems: Endpoint[];
}> {
    const logger = getLogger();
    let sapSystems: Endpoint[] = [];

    try {
        const storeService = await getService({ logger, entityName: 'system' });
        const systems = await storeService.getAll();
        sapSystems = transformStoredSystems(systems);
        const sapSystemNumber = Object.keys(sapSystems).length;
        if (sapSystemNumber > 0) {
            logger.info(t('info.numSapSystemsFound', { sapSystemNumber }));
        } else {
            logger.warn(t('warning.noSapSystemFound'));
        }
    } catch (error) {
        logger.error(t('error.retrievingSapSystems', { error: error.message }));
    }

    return {
        messages: logger.getMessages(),
        storedSystems: sapSystems
    };
}

/**
 * Transforms the systems format to Endpoint type.
 *
 * @param systems SAP systems retrieved from the store
 * @returns list of destinations in new format
 */
function transformStoredSystems(systems): Endpoint[] {
    const sapSystems: Endpoint[] = [];

    for (const s of systems) {
        const url = new URL(s.url).origin;
        const answerDestination: Endpoint = {
            Name: s.name,
            Url: url,
            Client: s.client,
            UserDisplayName: s.userDisplayName,
            Credentials:
                s.serviceKeys || s.username || s.password
                    ? {
                          serviceKeysContents: s.serviceKeys as ServiceInfo,
                          username: s.username,
                          password: s.password,
                          refreshToken: s.refreshToken
                      }
                    : undefined,
            Scp: !!s.serviceKeys
        };
        sapSystems.push(answerDestination);
    }
    return sapSystems;
}
