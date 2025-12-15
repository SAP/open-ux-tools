import { getService, BackendSystemKey } from '@sap-ux/store';
import type { BackendSystem } from '@sap-ux/store';
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

    // retrieve system credentials
    const storeService = await getService<BackendSystem, BackendSystemKey>({ logger, entityName: 'system' });
    const backendKey = new BackendSystemKey({ url: storedSystem.Url, client: storedSystem.Client });
    const sapSystem = await storeService.read(backendKey);

    const system = { ...storedSystem };

    system.Url = new URL(storedSystem.Url).origin;
    system.Credentials =
        sapSystem?.serviceKeys || sapSystem?.username || sapSystem?.password
            ? {
                  serviceKeysContents: sapSystem.serviceKeys as ServiceInfo,
                  username: sapSystem.username,
                  password: sapSystem.password,
                  refreshToken: sapSystem.refreshToken
              }
            : undefined;

    const abapServiceProvider = getServiceProvider(system);

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
    const { messages: sapUI5RepoMsgs, isSapUi5Repo: isSapUi5RepoResult } =
        await checkUi5AbapRepository(abapServiceProvider);
    logger.push(...sapUI5RepoMsgs);

    // check for transport requests
    const { messages: transportReqMsgs, isTransportRequests: isTransportRequestsResult } =
        await checkTransportRequests(abapServiceProvider);
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
        const answerDestination: Endpoint = {
            Name: s.name,
            Url: s.url,
            Client: s.client,
            UserDisplayName: s.userDisplayName,
            Scp: !!s.serviceKeys
        };
        sapSystems.push(answerDestination);
    }
    return sapSystems;
}
