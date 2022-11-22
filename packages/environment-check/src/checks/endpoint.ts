import type { ResultMessage, Endpoint, EndpointResults } from '../types';
import { getLogger } from '../logger';
import { isAppStudio } from '@sap-ux/btp-utils';
import { checkBASDestination, checkBASDestinations } from './destination';
import { checkStoredSystem, checkStoredSystems } from './stored-system';
import { t } from '../i18n';

/**
 * Checks the endpoints (SAP Systems or BAS Destinations) and returns a list.
 *
 * @returns messages, SAP systems
 */
export async function checkEndpoints(): Promise<{
    messages: ResultMessage[];
    endpoints: Endpoint[];
}> {
    const logger = getLogger();
    let endpoints: Endpoint[] = [];

    if (isAppStudio()) {
        const { messages: basDestMsgs, destinations } = await checkBASDestinations();
        endpoints = destinations;
        logger.push(...basDestMsgs);
    } else {
        const { messages: storedSysMsgs, storedSystems } = await checkStoredSystems();
        endpoints = storedSystems;
        logger.push(...storedSysMsgs);
    }

    return {
        messages: logger.getMessages(),
        endpoints: endpoints
    };
}

/**
 * Check an endpoint for information including results of v2 & v4 catalog service requests.
 *
 * @param endpoint - endpoint from list of all endpoints
 * @param username - destination username
 * @param password - destination password
 * @returns messages and sapSystem results
 */
export async function checkEndpoint(
    endpoint: Endpoint,
    username?: string | undefined,
    password?: string | undefined
): Promise<{ messages: ResultMessage[]; endpointResults: EndpointResults }> {
    const logger = getLogger();
    logger.info(t('info.checkingSapSystem', { sapSystem: endpoint.Name }));
    let destinationResults: EndpointResults;
    let storedSystemResults: EndpointResults;

    if (isAppStudio()) {
        const checkBASDestinationResult = await checkBASDestination(endpoint, username, password);
        destinationResults = checkBASDestinationResult.destinationResults;
        logger.push(...checkBASDestinationResult.messages);
    } else {
        const checkStoredSystemResult = await checkStoredSystem(endpoint);
        storedSystemResults = checkStoredSystemResult.storedSystemResults;
        logger.push(...checkStoredSystemResult.messages);
    }

    const endpointResults: EndpointResults = {
        ...destinationResults,
        ...storedSystemResults
    };

    return {
        messages: logger.getMessages(),
        endpointResults
    };
}
