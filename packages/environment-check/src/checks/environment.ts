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
    BASEnvironment,
    EnvironmentCheckResult,
    ResultMessage,
    VSCodeEnvironment
} from '../types';
import { DevelopmentEnvironment, Extensions, NpmModules } from '../types';
import { getInstalledExtensions, getCFCliToolVersion, getFioriGenVersion } from './install';
import { t } from '../i18n';

/**
 * Returns the BAS environment.
 *
 * @returns environment, including platform, versions ...
 */
export async function getBASEnvironment(): Promise<{ environment: BASEnvironment; messages: ResultMessage[] }> {
    const logger = getLogger();
    const environment: BASEnvironment = {
        developmentEnvironment: DevelopmentEnvironment.BAS,
        versions: process.versions,
        platform: process.platform
    };
    logger.info(t('info.developmentEnvironment', { env: environment.developmentEnvironment }));
    logger.info(t('info.versions', { versions: JSON.stringify(environment.versions, null, 4) }));
    logger.info(t('info.platform', { platform: environment.platform }));

    try {
        environment.basDevSpace = await getSbasDevspace();
        logger.info(t('info.basDevSpace', { basDevSpace: environment.basDevSpace }));
    } catch (error) {
        logger.info(t('error.basDevSpace', { error: error.message }));
    }

    return {
        environment,
        messages: logger.getMessages()
    };
}

/**
 * Returns the VSCode environment.
 *
 * @returns environment, including tools, extensions ...
 */
export async function getVSCodeEnvironment(): Promise<{
    environment: VSCodeEnvironment;
    messages: ResultMessage[];
}> {
    const logger = getLogger();

    const extensions = await getInstalledExtensions();
    const fioriGenVersion = await getFioriGenVersion(NpmModules.FioriGenerator);
    const cloudCli = await getCFCliToolVersion(NpmModules.CloudCliTools);

    const environment: VSCodeEnvironment = {
        nodeVersion: process.version,
        platform: process.platform,
        cloudCli: cloudCli,
        appWizard: extensions[Extensions.AppWizard]
            ? extensions[Extensions.AppWizard]['version']
            : t('info.notInstalled'),
        fioriGenVersion: fioriGenVersion,
        appMod: extensions[Extensions.AppMod] ? extensions[Extensions.AppMod]['version'] : t('info.notInstalled'),
        help: extensions[Extensions.Help] ? extensions[Extensions.Help]['version'] : t('info.notInstalled'),
        serviceMod: extensions[Extensions.ServiceMod]
            ? extensions[Extensions.ServiceMod]['version']
            : t('info.notInstalled'),
        annotationMod: extensions[Extensions.AnnotationMod]
            ? extensions[Extensions.AnnotationMod]['version']
            : t('info.notInstalled'),
        xmlToolkit: extensions[Extensions.XMLToolkit]
            ? extensions[Extensions.XMLToolkit]['version']
            : t('info.notInstalled'),
        cds: extensions[Extensions.CDS] ? extensions[Extensions.CDS]['version'] : t('info.notInstalled'),
        ui5LanguageAssistant: extensions[Extensions.Ui5LanguageAssistant]
            ? extensions[Extensions.Ui5LanguageAssistant]['version']
            : t('info.notInstalled')
    };

    logger.info(t('info.nodeVersion', { nodeVersion: environment.nodeVersion }));
    logger.info(t('info.platform', { platform: environment.platform }));
    logger.info(t('info.cloudCli', { cloudCli: environment.cloudCli }));
    logger.info(t('info.appWizard', { appWizard: environment.appWizard }));
    logger.info(t('info.fioriGenVersion', { fioriGenVersion: environment.fioriGenVersion }));
    logger.info(t('info.appMod', { appMod: environment.appMod }));
    logger.info(t('info.help', { help: environment.help }));
    logger.info(t('info.serviceMod', { serviceMod: environment.serviceMod }));
    logger.info(t('info.annotationMod', { annotationMod: environment.annotationMod }));
    logger.info(t('info.xmlToolkit', { xmlToolkit: environment.xmlToolkit }));
    logger.info(t('info.cds', { cds: environment.cds }));
    logger.info(t('info.ui5LanguageAssistant', { ui5LanguageAssistant: environment.ui5LanguageAssistant }));

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
    logger.info(
        deepDiveDestinations.size > 0
            ? t('info.detailsForDestinations', { destinations: Array.from(deepDiveDestinations).join(', ') })
            : t('info.noDetailsRequested')
    );

    for (const deepDiveDestination of Array.from(deepDiveDestinations)) {
        const checkDest = destinations.find((d) => d.Name === deepDiveDestination);
        if (checkDest) {
            const { messages: destMessages, destResults } = await getDestinationResults(checkDest, credentialCallback);
            logger.push(...destMessages);

            destinationResults[checkDest.Name] = destResults;
        } else {
            logger.warn(t('warning.destinationsNotFound', { deepDiveDestination, destNumber: destinations.length }));
        }
    }

    return {
        messages: logger.getMessages(),
        destinationResults
    };
}

/**
 * Return the environment.
 *
 * @returns environment, including ide, versions, ...
 */
export async function checkVSCodeEnvironment(): Promise<{
    environment: VSCodeEnvironment;
    messages: ResultMessage[];
}> {
    const logger = getLogger();

    const { environment, messages } = await getVSCodeEnvironment();
    logger.push(...messages);

    return {
        environment,
        messages: logger.getMessages()
    };
}

/**
 * Check environment includes process.env, list of destinations, details about destinations.
 *
 * @param options - see type CheckEnvironmentOptions, includes destination for deep dive, workspace roots, ...
 * @returns the result, currently as JSON
 */
export async function checkBASEnvironment(options?: CheckEnvironmentOptions): Promise<EnvironmentCheckResult> {
    const logger = getLogger();

    const { environment, messages } = await getBASEnvironment();
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
