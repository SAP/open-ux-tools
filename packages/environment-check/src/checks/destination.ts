import type { AxiosRequestConfig } from 'axios';
import { destinations as destinationsApi } from '@sap/bas-sdk';
import axios from 'axios';
import { getAppStudioProxyURL } from '@sap-ux/btp-utils';
import { getLogger } from '../logger';
import type { Destination, DestinationResults, ResultMessage } from '../types';
import { UrlServiceType, Severity } from '../types';
import { t } from '../i18n';
import { checkCatalogServices } from './catalog-service';
import { createForDestination } from '@sap-ux/axios-extension';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

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
    logger.info(t('info.checkingDestination', { destination: destination.Name }));

    const auth =
        username !== undefined && password !== undefined
            ? {
                  username,
                  password
              }
            : undefined;

    const axiosConfig: AxiosRequestConfig = {
        baseURL: destination.Host,
        auth: auth
    };

    const provider: AbapServiceProvider = createForDestination(axiosConfig, destination) as AbapServiceProvider;
    const { messages, result: catalogServiceResult } = await checkCatalogServices(provider, destination.Name);

    const html5DynamicDestination = !!destination['HTML5.DynamicDestination'];
    if (!html5DynamicDestination) {
        messages.push({
            severity: Severity.Error,
            text: t('error.missingDynamicDestProperty', { destination: destination.Name })
        });
    }

    const destinationResults: DestinationResults = {
        catalogService: catalogServiceResult,
        HTML5DynamicDestination: html5DynamicDestination
    };

    logger.push(...messages);

    return {
        messages: logger.getMessages(),
        destinationResults
    };
}

/**
 * Returns whether a given destination requires username/password.
 *
 * @param destination - the destination to check
 * @returns boolean if basic auth is required
 */
export function needsUsernamePassword(destination: Destination): boolean {
    return !!destination && destination.Authentication === 'NoAuthentication';
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
        logger.warn(t('warning.reloadFailure'));
        logger.debug(
            t('info.urlRequestFailure', {
                url: `${getAppStudioProxyURL() + '/reload'}`,
                error: error.message,
                errorObj: error.toJSON ? JSON.stringify(error.toJSON(), null, 4) : error
            })
        );
    }

    // Destinations request
    try {
        const response = await destinationsApi.getDestinations();
        const retrievedDestinations = transformDestination(response);

        for (const destination of retrievedDestinations) {
            destination.UrlServiceType = getUrlServiceTypeForDest(destination);
            destinations.push(destination);
        }

        const destinationNumber = Object.keys(destinations).length;
        if (destinationNumber > 0) {
            logger.info(t('info.numDestinationsFound', { destinationNumber }));
        } else {
            logger.warn(t('warning.noDestinationsFound'));
        }
    } catch (error) {
        logger.error(t('error.retrievingDestinations', { error: error.message }));
        logger.debug(
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
    const odataGen = !!destination.WebIDEUsage?.split(',').find((entry) => entry.trim() === 'odata_gen');
    const odataAbap = !!destination.WebIDEUsage?.split(',').find((entry) => entry.trim() === 'odata_abap');
    const fullUrl = destination.WebIDEAdditionalData === 'full_url';

    if (odataGen && fullUrl && !odataAbap) {
        urlServiceType = UrlServiceType.FullServiceUrl;
    } else if (!odataGen && !fullUrl && odataAbap) {
        urlServiceType = UrlServiceType.CatalogServiceUrl;
    } else if (odataGen && !fullUrl && !odataAbap) {
        urlServiceType = UrlServiceType.PartialUrl;
    }
    return urlServiceType;
}

/**
 * Transforms the destination format to align with @sap-ux/btp-utils Destination type.
 *
 * @param destinationInfo DestinationListInfo[] from '@sap/bas-sdk'
 * @returns list of destinations in new (flat) format
 */
function transformDestination(destinationInfo): Destination[] {
    const destinations: Destination[] = [];

    for (const destInfo of destinationInfo) {
        const answerDestination: Destination = {
            Name: destInfo.name,
            Type: 'HTTP',
            Authentication: destInfo.credentials.authentication,
            ProxyType: destInfo.proxyType,
            Description: destInfo.description,
            Host: destInfo.host
        };

        if (destInfo.basProperties?.additionalData) {
            answerDestination.WebIDEAdditionalData = destInfo.basProperties.additionalData;
        }

        if (destInfo.basProperties?.usage) {
            answerDestination.WebIDEUsage = String(destInfo.basProperties.usage);
        }

        if (destInfo.basProperties?.sapClient) {
            answerDestination['sap-client'] = destInfo.basProperties.sapClient;
        }

        if (destInfo.basProperties?.html5DynamicDestination !== undefined) {
            answerDestination['HTML5.DynamicDestination'] = destInfo.basProperties.html5DynamicDestination;
        }

        destinations.push(answerDestination);
    }
    return destinations;
}

/**
 * Internal function to check a destination.
 *
 * @param destination - the destination to get detailed results for
 * @param credentialCallback - callback in case user credentials are required to query a destination
 * @returns - messages and detailed destination check results
 */
async function getDestinationResults(
    destination: Destination,
    credentialCallback: (destination: Destination) => Promise<{
        username: string;
        password: string;
    }>
): Promise<{ messages: ResultMessage[]; destinationResults: DestinationResults }> {
    const logger = getLogger();
    let username: string;
    let password: string;

    if (needsUsernamePassword(destination)) {
        if (typeof credentialCallback === 'function') {
            const credentials = await credentialCallback(destination);
            if (credentials && credentials.username && credentials.password) {
                username = credentials.username;
                password = credentials.password;
            }
        } else {
            logger.warn(
                t('warning.basicAuthRequired', {
                    destination: destination.Name
                })
            );
        }
    }

    const destDetails = await checkBASDestination(destination, username, password);
    logger.push(...destDetails.messages);

    return {
        messages: logger.getMessages(),
        destinationResults: destDetails.destinationResults
    };
}

/**
 * Internal function to check a set of destinations (deep dive into them).
 *
 * @param deepDiveDestinations - destinations selected for a closer look
 * @param destinations - array of all destinations that contains url and destination type information
 * @param credentialCallback - callback in case user credentials are required to query a destination
 * @returns - messages and the map of detailed destination check results
 */
export async function getDestinationsResults(
    deepDiveDestinations: Set<string>,
    destinations: Destination[],
    credentialCallback?: (destination: Destination) => Promise<{
        username: string;
        password: string;
    }>
): Promise<{ messages: ResultMessage[]; destinationResults: { [dest: string]: DestinationResults } }> {
    const logger = getLogger();
    const destinationResults: { [dest: string]: DestinationResults } = {};
    logger.info(
        deepDiveDestinations.size > 0
            ? t('info.detailsForDestinations', { destinations: Array.from(deepDiveDestinations).join(', ') })
            : t('info.noDetailsRequested')
    );

    for (const deepDiveDestination of Array.from(deepDiveDestinations)) {
        const checkDest = destinations.find((d) => d.Name === deepDiveDestination);
        if (checkDest) {
            const { messages: destMessages, destinationResults } = await getDestinationResults(
                checkDest,
                credentialCallback
            );
            logger.push(...destMessages);

            destinationResults[checkDest.Name] = destinationResults;
        } else {
            logger.warn(t('warning.destinationsNotFound', { deepDiveDestination, destNumber: destinations.length }));
        }
    }

    return {
        messages: logger.getMessages(),
        destinationResults
    };
}
