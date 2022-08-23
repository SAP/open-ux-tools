import type { AxiosRequestConfig } from 'axios';
import { destinations as destinationsApi } from '@sap/bas-sdk';
import axios from 'axios';
import { isAppStudio, getAppStudioProxyURL } from '@sap-ux/btp-utils';
import { getLogger } from '../logger';
import { countNumberOfServices, getServiceCountText } from '../formatter';
import type { CatalogResultV2, CatalogResultV4, DestinationResults, Destination, ResultMessage } from '../types';
import { Severity, UrlServiceType } from '../types';
import { t } from '../i18n';
import { createForAbap, ODataVersion } from '@sap-ux/axios-extension';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

const catalogMessages = {
    401: (destination: Destination, odataVersion: ODataVersion): string =>
        t('error.401', { odataVersion, destination: destination.name }),
    403: (destination: Destination, odataVersion: ODataVersion): string =>
        t('error.403', { odataVersion, destination: destination.name })
};

/**
 * Check a BAS destination, like catalog service v2 & v4.
 *
 * @param destination - Destination from list of all destinations
 * @param username username
 * @param password password
 * @returns messages and destination results
 */
export async function checkBASDestination(
    destination: Destination,
    username?: string | undefined,
    password?: string | undefined
): Promise<{ messages: ResultMessage[]; destinationResults: DestinationResults }> {
    const logger = getLogger();
    logger.log(t('checkingDestination', { destination: destination.name }));

    const { messages, result: destinationResults } = await checkCatalogServices(destination, username, password);

    logger.push(...messages);
    return {
        messages: logger.getMessages(),
        destinationResults
    };
}

/**
 * Checks for services from catalog requests.
 *
 * @param destination sap detination
 * @param username username
 * @param password password
 * @returns Result messages and results of catalog requests
 */
async function checkCatalogServices(
    destination: Destination,
    username?: string | undefined,
    password?: string | undefined
): Promise<{ messages: ResultMessage[]; result: DestinationResults }> {
    const messages: ResultMessage[] = [];

    const v2results = await catalogRequest(ODataVersion.v2, destination, username, password);
    messages.push(...v2results.messages);

    const v4results = await catalogRequest(ODataVersion.v4, destination, username, password);
    messages.push(...v4results.messages);

    const html5DynamicDestination = !!destination.basProperties?.html5DynamicDestination;

    if (!html5DynamicDestination) {
        messages.push({
            severity: Severity.Error,
            text: t('error.missingDynamicDestProperty', { destination: destination.name })
        });
    }

    const result: DestinationResults = {
        v2: { results: v2results.result, status: v2results.responseStatus },
        v4: { results: v4results.result, status: v4results.responseStatus },
        HTML5DynamicDestination: html5DynamicDestination
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
 * @param destination destination to be checked
 * @param username username
 * @param password password
 * @returns messages, catalog results, response status
 */
async function catalogRequest(
    odataVersion: ODataVersion,
    destination: Destination,
    username?: string | undefined,
    password?: string | undefined
): Promise<{ messages: ResultMessage[]; result: CatalogResultV2 | CatalogResultV4; responseStatus: number }> {
    const logger = getLogger();
    let result: CatalogResultV2 | CatalogResultV4;
    let url: string;
    let responseStatus: number;
    try {
        const auth =
            username !== undefined && password !== undefined
                ? {
                      username,
                      password
                  }
                : undefined;

        const axiosConfig: AxiosRequestConfig = {
            baseURL: destination.host,
            auth: auth
        };

        const provider: AbapServiceProvider = createForAbap(axiosConfig);
        const catalog = provider.catalog(odataVersion);
        result = await catalog.listServices();
        if (result.length > 0) {
            const numberOfServices = countNumberOfServices(result);
            logger.log(
                t('info.numServicesForDestination', {
                    odataVersion,
                    destination: destination.name,
                    numServicesForDest: getServiceCountText(numberOfServices)
                })
            );
        }
    } catch (error) {
        responseStatus = error?.response?.status || error?.cause?.status;
        logger.error(
            catalogMessages[responseStatus]
                ? catalogMessages[responseStatus](destination, odataVersion)
                : t('error.queryFailure', { odataVersion, destination: destination.name })
        );
        const errorJson = error.toJSON ? error.toJSON() : {};
        if (errorJson?.config?.auth?.password) {
            delete errorJson.config.auth.password;
        }
        logger.info(t('error.urlRequestFailure', { url, error: error.message, errorObj: error }));
    }
    return {
        messages: logger.getMessages(),
        result,
        responseStatus
    };
}

/**
 * Returns whether a given destination requires username/password.
 *
 * @param destination - the destination to check
 * @returns boolean if basic auth is required
 */
export function needsUsernamePassword(destination: Destination): boolean {
    return !!destination && destination.credentials?.authentication === 'NoAuthentication';
}

/**
 * Checks the destinations and returns a list. Optionally, deep dive into a list of passed destinations.
 *
 * @returns messages, destinations
 */
export async function checkBASDestinations(): Promise<{
    messages: ResultMessage[];
    destinations: Destination[];
}> {
    const logger = getLogger();
    const destinations: Destination[] = [];
    let url: string;

    // Reload request
    try {
        await axios.get(getAppStudioProxyURL() + '/reload');
    } catch (error) {
        logger.warning(t('warning.reloadFailure'));
        logger.info(
            t('info.urlRequestFailure', {
                url: `${getAppStudioProxyURL() + '/reload'}`,
                error: error.message,
                errorObj: error.toJSON ? JSON.stringify(error.toJSON(), null, 4) : error
            })
        );
    }
    // Destinations request
    try {
        let retrievedDestinations: Destination[] = [];

        if (isAppStudio()) {
            const response = await destinationsApi.getDestinations();
            retrievedDestinations = response;
        } else {
            // Destination check for VSCode would go here
        }

        for (const destination of retrievedDestinations) {
            destination.urlServiceType = getUrlServiceTypeForDest(destination);
            destinations.push(destination);
        }

        const destinationNumber = Object.keys(destinations).length;
        if (destinationNumber > 0) {
            logger.log(t('info.numDestinationsFound', { destinationNumber }));
        } else {
            logger.warning(t('warning.noDestinationsFound'));
        }
    } catch (error) {
        logger.error(t('error.retrievingDestinations', { error: error.message }));
        logger.info(
            t('info.urlRequestFailure', {
                url: url,
                error: error.message,
                errorObj: error.toJSON ? JSON.stringify(error.toJSON(), null, 4) : error
            })
        );
    }
    return {
        messages: logger.getMessages(),
        destinations
    };
}

/**
 * Return the URL service type for a given destination.
 *
 * @param destination - destination to check
 * @returns - URL service type, like 'Full Service URL', 'Catalog Service', 'Partial URL'
 */
function getUrlServiceTypeForDest(destination: Destination): UrlServiceType {
    let urlServiceType: UrlServiceType = UrlServiceType.InvalidUrl;
    const odataGen = !!destination.basProperties?.usage?.split(',').find((entry) => entry.trim() === 'odata_gen');
    const odataAbap = !!destination.basProperties?.usage?.split(',').find((entry) => entry.trim() === 'odata_abap');
    const fullUrl = destination.basProperties?.additionalData === 'full_url';

    if (odataGen && fullUrl && !odataAbap) {
        urlServiceType = UrlServiceType.FullServiceUrl;
    } else if (!odataGen && !fullUrl && odataAbap) {
        urlServiceType = UrlServiceType.CatalogServiceUrl;
    } else if (odataGen && !fullUrl && !odataAbap) {
        urlServiceType = UrlServiceType.PartialUrl;
    }
    return urlServiceType;
}
