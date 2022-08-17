import axios from 'axios';
import { isAppStudio } from '@sap-ux/btp-utils';
import { checkBASDestination, checkBASDestinations, needsUsernamePassword } from './destination';
import { getDestinationsFromWorkspace } from './workspace';
import { getLogger } from '../logger';
import { core as basCoreApi } from '@sap/bas-sdk';
import type {
    DestinationResults,
    CheckEnvironmentOptions,
    Destination,
    Environment,
    EnvironmentCheckResult,
    ResultMessage
} from '../types';
import { DevelopmentEnvironment } from '../types';
import { t } from '../i18n';

/**
 * Return the environment.
 *
 * @returns environment, including ide, versions, ...
 */
export async function getEnvironment(): Promise<{ environment: Environment; messages: ResultMessage[] }> {
    const logger = getLogger();
    const environment: Environment = {
        developmentEnvironment: isAppStudio() ? DevelopmentEnvironment.BAS : DevelopmentEnvironment.VSCode,
        versions: process.versions,
        platform: process.platform
    };
    logger.log(t('info.developmentEnvironment', { env: environment.developmentEnvironment }));
    logger.log(t('info.versions', { versions: JSON.stringify(environment.versions, null, 4) }));
    logger.log(t('info.platform', { plaform: environment.platform }));

    try {
        environment.basDevSpace = isAppStudio() ? await getSbasDevspace() : undefined;
        logger.log(t('info.basDevSpace', { basDevSpace: environment.basDevSpace }));
    } catch (error) {
        logger.log(t('error.basDevSpace', { error: error.message }));
    }

    return {
        environment,
        messages: logger.getMessages()
    };
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
): Promise<{ messages: ResultMessage[]; destResults: DestinationResults }> {
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
            logger.warning(
                t('warning.basicAuthRequired', {
                    destination: destination.name
                })
            );
        }
    }
    const destDetails = await checkBASDestination(destination, username, password);
    logger.push(...destDetails.messages);

    return {
        messages: logger.getMessages(),
        destResults: destDetails.destinationResults
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
async function getDestinationsResults(
    deepDiveDestinations: Set<string>,
    destinations: Destination[],
    credentialCallback?: (destination: Destination) => Promise<{
        username: string;
        password: string;
    }>
): Promise<{ messages: ResultMessage[]; destinationResults: { [dest: string]: DestinationResults } }> {
    const logger = getLogger();
    const destinationResults: { [dest: string]: DestinationResults } = {};
    logger.log(
        deepDiveDestinations.size > 0
            ? t('info.detailsForDestinations', { destinations: Array.from(deepDiveDestinations).join(', ') })
            : t('info.noDetailsRequested')
    );
    for (const deepDiveDestination of Array.from(deepDiveDestinations)) {
        const checkDest = destinations.find((d) => d.name === deepDiveDestination);
        if (checkDest) {
            const { messages: destMessages, destResults } = await getDestinationResults(checkDest, credentialCallback);
            logger.push(...destMessages);
            destinationResults[checkDest.name] = destResults;
        } else {
            logger.warning(t('warning.destinationsNotFound', { deepDiveDestination, destNumber: destinations.length }));
        }
    }
    return {
        messages: logger.getMessages(),
        destinationResults
    };
}

/**
 * Check environment includes process.env, list of destinations, details about destinations.
 *
 * @param options - see type CheckEnvironmentOptions, includes destination for deep dive, workspace roots, ...
 * @returns the result, currently as JSON
 */
export async function checkEnvironment(options?: CheckEnvironmentOptions): Promise<EnvironmentCheckResult> {
    const logger = getLogger();

    const { environment, messages } = await getEnvironment();
    logger.push(...messages);

    const deepDiveDestinations = options?.destinations ? new Set(options.destinations) : new Set<string>();
    if (options?.workspaceRoots?.length > 0) {
        const workspaceResults = await getDestinationsFromWorkspace(options?.workspaceRoots);
        logger.push(...workspaceResults.messages);
        workspaceResults.destinations.forEach((dest) => deepDiveDestinations.add(dest));
    }

    const { messages: destMessages, destinations } = await checkBASDestinations();
    logger.push(...destMessages);

    const { messages: destDetailsMessages, destinationResults } = await getDestinationsResults(
        deepDiveDestinations,
        destinations,
        options?.credentialCallback
    );
    logger.push(...destDetailsMessages);

    return {
        environment,
        destinations,
        destinationResults,
        messages: logger.getMessages()
    };
}

/**
 * Obtain dev space type from SBAS rest api.
 *
 * @returns SBAS Dev Space Name. Empty string is returned if unable to fetch workspace type or the environment is not SBAS
 */
async function getSbasDevspace(): Promise<string> {
    if (isAppStudio()) {
        const h20Url = basCoreApi.getEnvValue('H2O_URL');
        let workspaceId = '';
        if (process.env.WORKSPACE_ID) {
            workspaceId = process.env.WORKSPACE_ID.replace('workspaces-', '');
        }
        const url = `${h20Url}/ws-manager/api/v1/workspace/${workspaceId}`;
        const response = await axios.get(url);
        if (response.data) {
            const workspaceConfig = response.data;
            const devspace = workspaceConfig?.config?.annotations?.pack;
            return devspace ? devspace : '';
        }
    }
    return '';
}
