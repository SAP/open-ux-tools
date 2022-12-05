import type { AbapServiceProvider, ODataServiceInfo, AxiosRequestConfig } from '@sap-ux/axios-extension';
import type { CatalogServiceResult, ResultMessage, Endpoint } from '../types';
import {
    AtoService,
    TransportChecksService,
    ODataVersion,
    AbapCloudEnvironment,
    createForAbap,
    createForAbapOnCloud,
    createForDestination
} from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import { countNumberOfServices, getServiceCountText } from '../formatter';
import { getLogger } from '../logger';
import { t } from '../i18n';

const catalogMessages = {
    401: (systemName: string, odataVersion: ODataVersion): string =>
        t('error.401', { odataVersion, system: systemName }),
    403: (systemName: string, odataVersion: ODataVersion): string =>
        t('error.403', { odataVersion, system: systemName })
};

/**
 * Internal function to create a service provider.
 *
 * @param endpoint - the SAP system
 * @param username - username for endpoint
 * @param password - password for endpoint
 * @returns - ABAP service provider
 */
export function getServiceProvider(
    endpoint: Endpoint,
    username?: string | undefined,
    password?: string | undefined
): AbapServiceProvider {
    let abapServiceProvider: AbapServiceProvider;

    if (isAppStudio()) {
        const auth =
            username !== undefined && password !== undefined
                ? {
                      username,
                      password
                  }
                : undefined;

        const axiosConfig: AxiosRequestConfig = {
            baseURL: endpoint.Host,
            auth: auth
        };

        abapServiceProvider = createForDestination(axiosConfig, endpoint) as AbapServiceProvider;
    } else if (endpoint.Scp) {
        // btp service provier if scp is true
        abapServiceProvider = createForAbapOnCloud({
            refreshToken: (endpoint as any).Credentials?.refreshToken,
            environment: AbapCloudEnvironment.Standalone,
            service: (endpoint as any).Credentials?.serviceKeysContents
        });
    } else {
        // abap on-premise
        abapServiceProvider = createForAbap({
            baseURL: endpoint.Url,
            ignoreCertErrors: true,
            auth: {
                username: endpoint.Credentials?.username,
                password: endpoint.Credentials?.password
            }
        });
    }
    return abapServiceProvider;
}

/**
 * Checks for services from catalog requests.
 *
 * @param provider the AbapServiceProvider to be used
 * @param systemName name of SAP system or destination
 * @returns Result messages and results of catalog requests
 */
export async function checkCatalogServices(
    provider: AbapServiceProvider,
    systemName: string
): Promise<{ messages: ResultMessage[]; result: CatalogServiceResult }> {
    const messages: ResultMessage[] = [];

    const v2results = await catalogRequest(ODataVersion.v2, provider, systemName);
    messages.push(...v2results.messages);

    const v4results = await catalogRequest(ODataVersion.v4, provider, systemName);
    messages.push(...v4results.messages);

    const result: CatalogServiceResult = {
        v2: { results: v2results.result, status: v2results.responseStatus },
        v4: { results: v4results.result, status: v4results.responseStatus }
    };

    return {
        messages,
        result
    };
}

/**
 * Performs a catalog request for the given odata version and destination.
 *
 * @param odataVersion odataVersion to be used
 * @param provider the AbapServiceProvider to be used
 * @param systemName name of SAP system or destination
 * @returns messages, catalog results, response status
 */
async function catalogRequest(
    odataVersion: ODataVersion,
    provider: AbapServiceProvider,
    systemName: string
): Promise<{ messages: ResultMessage[]; result: ODataServiceInfo[]; responseStatus: number }> {
    const logger = getLogger();
    let result: ODataServiceInfo[];
    let url: string;
    let responseStatus: number;
    try {
        const catalog = provider.catalog(odataVersion);
        result = await catalog.listServices();
        if (result.length > 0) {
            const numberOfServices = countNumberOfServices(result);
            logger.info(
                t('info.numServicesForSystem', {
                    odataVersion,
                    system: systemName,
                    numServicesForSystem: getServiceCountText(numberOfServices)
                })
            );
        }
    } catch (error) {
        responseStatus = error?.response?.status || error?.cause?.status;
        logger.error(
            catalogMessages[responseStatus]
                ? catalogMessages[responseStatus](systemName, odataVersion)
                : t('error.queryFailure', { odataVersion, system: systemName })
        );
        const errorJson = error.toJSON ? error.toJSON() : {};
        if (errorJson?.config?.auth?.password) {
            delete errorJson.config.auth.password;
        }
        logger.debug(t('error.urlRequestFailure', { url, error: error.message, errorObj: error }));
    }
    return {
        messages: logger.getMessages(),
        result,
        responseStatus
    };
}

/**
 * Checks if ATO catalog is available.
 *
 * @param provider the AbapServiceProvider to be used
 * @returns Result messages and result of ato catalog request
 */
export async function checkAtoCatalog(
    provider: AbapServiceProvider
): Promise<{ messages: ResultMessage[]; isAtoCatalog: boolean }> {
    const logger = getLogger();
    let isAtoCatalog = false;
    try {
        const atdService = await provider.getAdtService<AtoService>(AtoService);
        const atoSettings = await atdService.getAtoInfo();
        if (Object.keys(atoSettings).length) {
            isAtoCatalog = true;
            logger.info(t('info.atoCatalogAvailable'));
            logger.debug(atoSettings);
        } else {
            logger.warn(t('warning.atoCatalogNotAvailable'));
        }
    } catch (e) {
        logger.error(t('error.atoCatalogError'));
        logger.debug(e.message);
    }
    return {
        messages: logger.getMessages(),
        isAtoCatalog
    };
}

/**
 * Checks for an existing instance of the UI5 ABAP repository service or creates one.
 *
 * @param provider the AbapServiceProvider to be used
 * @returns Result messages and result of the request
 */
export async function checkUi5AbapRepository(
    provider: AbapServiceProvider
): Promise<{ messages: ResultMessage[]; isSapUi5Repo: boolean }> {
    const logger = getLogger();
    let isSapUi5Repo = false;
    try {
        const sapUI5Repo = provider.getUi5AbapRepository();
        const response = await sapUI5Repo.get('', {
            headers: {
                Accept: 'application/*'
            }
        });
        if (response.status === 200) {
            isSapUi5Repo = true;
            logger.info(t('info.sapUI5RepoAvailable'));
        } else {
            logger.warn(t('warning.sapUI5RepoNotDetermined'));
        }

        logger.debug(t('debug.ui5AbapStatusCode', { status: response.status }));
        logger.debug(t('debug.ui5AbapStatusText', { statusText: response.statusText }));
    } catch (e) {
        logger.error(t('error.sapUI5RepoError'));
        logger.debug(e.message);
    }
    return {
        messages: logger.getMessages(),
        isSapUi5Repo
    };
}

/**
 * Checks for the ability to retrieve available transport requests.
 *
 * @param provider the AbapServiceProvider to be used
 * @returns Result messages and result of the request
 */
export async function checkTransportRequests(
    provider: AbapServiceProvider
): Promise<{ messages: ResultMessage[]; isTransportRequests: boolean }> {
    const logger = getLogger();
    let isTransportRequests = false;
    try {
        const adtService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        if (adtService?.getTransportRequests) {
            isTransportRequests = true;
            logger.info(t('info.getTransportRequestsAvailable'));
        } else {
            logger.warn(t('warning.getTransportRequestsoNotAvailable'));
        }
    } catch (e) {
        logger.error(t('error.getTransportRequestsError'));
        logger.debug(e.message);
    }
    return {
        messages: logger.getMessages(),
        isTransportRequests
    };
}
