import { getService } from '@sap-ux/store';
import type { ResultMessage, SapSystem, SapSystemResults } from '../types';
import { getLogger } from '../logger';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { t } from '../i18n';
import { checkCatalogServices } from './catalog-service';
import { AbapCloudEnvironment, createForAbap, createForAbapOnCloud } from '@sap-ux/axios-extension';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { checkAtoCatalog, checkUi5AbapRepository, checkTransportRequests } from './system-info';

/**
 * Internal function to create a service provider.
 *
 * @param sapSystem - the SAP system
 * @returns - ABAP service provider
 */
function getServiceProvider(sapSystem: SapSystem): AbapServiceProvider {
    let abapServiceProvider: AbapServiceProvider;
    if (sapSystem.scp) {
        // btp service provier if scp is true
        abapServiceProvider = createForAbapOnCloud({
            refreshToken: (sapSystem as any).credentials?.refreshToken,
            environment: AbapCloudEnvironment.Standalone,
            service: (sapSystem as any).credentials?.serviceKeysContents
        });
    } else {
        // abap on-premise
        abapServiceProvider = createForAbap({
            baseURL: sapSystem.url,
            ignoreCertErrors: true,
            auth: {
                username: sapSystem.credentials?.username,
                password: sapSystem.credentials?.password
            }
        });
    }
    return abapServiceProvider;
}

/**
 * Check a SAP system for v2 & v4 catalog services.
 *
 * @param sapSystem - SAP system from list of all systems
 * @returns messages and sapSystem results
 */
export async function checkSapSystem(
    sapSystem: SapSystem
): Promise<{ messages: ResultMessage[]; sapSystemResults: SapSystemResults }> {
    const logger = getLogger();
    logger.info(t('info.checkingSapSystem', { sapSystem: sapSystem.name }));

    const abapServiceProvider = getServiceProvider(sapSystem);

    // catalog service request
    const { messages: catalogMsgs, result: catalogServiceResult } = await checkCatalogServices(
        abapServiceProvider,
        sapSystem.name
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

    const sapSystemResults: SapSystemResults = {
        catalogService: catalogServiceResult,
        isAtoCatalog: isAtoCatalogResult,
        isSapUi5Repo: isSapUi5RepoResult,
        isTransportRequests: isTransportRequestsResult
    };

    return {
        messages: logger.getMessages(),
        sapSystemResults
    };
}

/**
 * Checks the saved SAP systems and returns a list.
 *
 * @returns messages, destinations
 */
export async function checkSapSystems(): Promise<{
    messages: ResultMessage[];
    sapSystems: SapSystem[];
}> {
    const logger = getLogger();
    let sapSystems: SapSystem[] = [];

    try {
        const storeService = await getService({ logger, entityName: 'system' });
        const systems = await storeService.getAll();
        sapSystems = transformSapSystem(systems);
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
        sapSystems: sapSystems
    };
}

/**
 * Transforms the systems format to SapSystem type.
 *
 * @param systems DestinationListInfo[] from '@sap/bas-sdk'
 * @returns list of destinations in new format
 */
function transformSapSystem(systems): SapSystem[] {
    const sapSystems: SapSystem[] = [];

    for (const s of systems) {
        const answerDestination: SapSystem = {
            name: s.name,
            url: s.url,
            client: s.client,
            userDisplayName: s.userDisplayName,
            credentials:
                s.serviceKeys || s.username || s.password
                    ? {
                          serviceKeysContents: s.serviceKeys as ServiceInfo,
                          username: s.username,
                          password: s.password,
                          refreshToken: s.refreshToken
                      }
                    : undefined,
            scp: !!s.serviceKeys
        };
        sapSystems.push(answerDestination);
    }

    return sapSystems;
}

/**
 * Internal function to check a SAP system.
 *
 * @param sapSystem - the SAP system to get detailed results for
 * @returns - messages and detailed destination check results
 */
async function getSapSystemResults(
    sapSystem: SapSystem
): Promise<{ messages: ResultMessage[]; sapSystemResults: SapSystemResults }> {
    const logger = getLogger();

    const sapSystemDetails = await checkSapSystem(sapSystem);
    logger.push(...sapSystemDetails.messages);

    return {
        messages: logger.getMessages(),
        sapSystemResults: sapSystemDetails.sapSystemResults
    };
}

/**
 * Check a set of SAP system (deep dive into them).
 *
 * @param deepDiveSapSystems - SAP systems selected for a closer look
 * @param sapSystems - array of all destinations that contains url and destination type information
 * @returns - messages and the map of detailed destination check results
 */
export async function getSapSystemsResults(
    deepDiveSapSystems: Set<string>,
    sapSystems: SapSystem[]
): Promise<{ messages: ResultMessage[]; systemResults: { [dest: string]: SapSystemResults } }> {
    const logger = getLogger();
    const systemResults: { [system: string]: SapSystemResults } = {};
    logger.info(
        deepDiveSapSystems.size > 0
            ? t('info.detailsForSapSystem', { sapSystems: Array.from(deepDiveSapSystems).join(', ') })
            : t('info.noDetailsRequested')
    );

    for (const deepDiveSapSystem of Array.from(deepDiveSapSystems)) {
        const checkDest = sapSystems.find((d) => d.name === deepDiveSapSystem);
        if (checkDest) {
            const { messages: destMessages, sapSystemResults } = await getSapSystemResults(checkDest);
            logger.push(...destMessages);

            systemResults[checkDest.name] = sapSystemResults;
        } else {
            logger.warn(t('warning.sapSystemsNotFound', { deepDiveSapSystem, sysNumber: sapSystems.length }));
        }
    }

    return {
        messages: logger.getMessages(),
        systemResults
    };
}
