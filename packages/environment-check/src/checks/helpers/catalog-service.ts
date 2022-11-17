import { countNumberOfServices, getServiceCountText } from '../../formatter';
import type { CatalogServiceResult, ResultMessage } from '../../types';
import { getLogger } from '../../logger';
import { ODataVersion } from '@sap-ux/axios-extension';
import type { AbapServiceProvider, ODataServiceInfo } from '@sap-ux/axios-extension';
import { t } from '../../i18n';

const catalogMessages = {
    401: (systemName: string, odataVersion: ODataVersion): string =>
        t('error.401', { odataVersion, system: systemName }),
    403: (systemName: string, odataVersion: ODataVersion): string =>
        t('error.403', { odataVersion, system: systemName })
};

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
