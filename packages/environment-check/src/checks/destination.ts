import type { Endpoint, ResultMessage, EndpointResults } from '../types';
import { destinations as destinationsApi } from '@sap/bas-sdk';
import axios from 'axios';
import { getAppStudioProxyURL } from '@sap-ux/btp-utils';
import { getLogger } from '../logger';
import { UrlServiceType, Severity } from '../types';
import { t } from '../i18n';
import { getServiceProvider, checkCatalogServices } from './service-checks';

/**
 * Check a BAS destination, like catalog service v2 & v4.
 *
 * @param destination - Destination from list of all destinations
 * @param username - username
 * @param password - password
 * @returns messages and destination results
 */
export async function checkBASDestination(
    destination: Endpoint,
    username?: string | undefined,
    password?: string | undefined
): Promise<{ messages: ResultMessage[]; destinationResults: EndpointResults }> {
    const logger = getLogger();

    const abapServiceProvider = getServiceProvider(destination, username, password);

    // catalog service request
    const { messages: catalogMsgs, result: catalogServiceResult } = await checkCatalogServices(
        abapServiceProvider,
        destination.Name
    );
    logger.push(...catalogMsgs);

    const html5DynamicDestination = !!destination['HTML5.DynamicDestination'];
    if (!html5DynamicDestination) {
        logger.push({
            severity: Severity.Error,
            text: t('error.missingDynamicDestProperty', { destination: destination.Name })
        });
    }

    const destinationResults: EndpointResults = {
        catalogService: catalogServiceResult,
        HTML5DynamicDestination: html5DynamicDestination
    };

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
export function needsUsernamePassword(destination: Endpoint): boolean {
    return !!destination && destination.Authentication === 'NoAuthentication';
}

/**
 * Checks the destinations and returns a list.
 *
 * @returns messages, destinations
 */
export async function checkBASDestinations(): Promise<{
    messages: ResultMessage[];
    destinations: Endpoint[];
}> {
    const logger = getLogger();
    const destinations: Endpoint[] = [];
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
        const retrievedDestinations = transformDestinations(response);

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
 * Transforms the destination format into generic Endpoint type.
 *
 * @param destinationInfo DestinationListInfo[] from '@sap/bas-sdk'
 * @returns list of destinations in new (flat) format
 */
function transformDestinations(destinationInfo): Endpoint[] {
    const destinations: Endpoint[] = [];

    for (const destInfo of destinationInfo) {
        const answerDestination: Endpoint = {
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
 * Return the URL service type for a given destination.
 *
 * @param destination - destination to check
 * @returns - URL service type, like 'Full Service URL', 'Catalog Service', 'Partial URL'
 */
export function getUrlServiceTypeForDest(destination: Endpoint): UrlServiceType {
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
