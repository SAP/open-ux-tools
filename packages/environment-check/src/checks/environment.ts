import { isAppStudio } from '@sap-ux/btp-utils';
import { checkBASDestinations, needsUsernamePassword } from './destination';
import { checkSapSystem } from './sap-system';
import { checkStoredSystems } from './stored-system';
import { getDestinationsFromWorkspace } from './workspace';
import { getLogger } from '../logger';
import { devspace } from '@sap/bas-sdk';
import type {
    CheckEnvironmentOptions,
    Environment,
    EnvironmentCheckResult,
    ResultMessage,
    ToolsExtensions,
    SapSystem,
    SapSystemResults
} from '../types';
import { Check, DevelopmentEnvironment, Extensions } from '../types';
import { getInstalledExtensions, getCFCliToolVersion, getFioriGenVersion, getProcessVersions } from './get-installed';
import { t } from '../i18n';

/**
 * Return the environment.
 *
 * @returns environment, including ide, versions, ...
 */
export async function getEnvironment(): Promise<{ environment: Environment; messages: ResultMessage[] }> {
    const logger = getLogger();
    const processVersions = await getProcessVersions(logger);
    const environment: Environment = {
        developmentEnvironment: isAppStudio() ? DevelopmentEnvironment.BAS : DevelopmentEnvironment.VSCode,
        versions: processVersions,
        platform: process.platform
    };

    logger.info(t('info.platform', { platform: environment.platform }));
    logger.info(t('info.developmentEnvironment', { env: environment.developmentEnvironment }));

    try {
        if (isAppStudio()) {
            environment.basDevSpace = (await devspace.getDevspaceInfo()).packDisplayName;
            logger.info(t('info.basDevSpace', { basDevSpace: environment.basDevSpace }));
        }
    } catch (error) {
        logger.info(t('error.basDevSpace', { error: error.message }));
    }

    const toolsExtensionResults = await getToolsExtensions();
    environment.toolsExtensions = toolsExtensionResults.toolsExtensions;
    logger.push(...toolsExtensionResults.messages);

    logger.info(t('info.versions', { versions: JSON.stringify(environment.versions, null, 4) }));

    return {
        environment,
        messages: logger.getMessages()
    };
}

/**
 * Returns extensions and versions.
 *
 * @param extensions to be checked
 * @returns extension with version numbers
 */
function getExtVersions(extensions: { [id: string]: { version: string } }): { [id: string]: string } {
    return {
        appWizard: extensions[Extensions.AppWizard]
            ? extensions[Extensions.AppWizard]['version']
            : t('info.notInstalled'),
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
}

/**
 * Returns the tools and extensions installed.
 *
 * @returns tools and extension versions
 */
async function getToolsExtensions(): Promise<{
    toolsExtensions: ToolsExtensions;
    messages: ResultMessage[];
}> {
    const logger = getLogger();

    const extensions = await getInstalledExtensions(logger);
    const fioriGenVersion = await getFioriGenVersion();
    const cloudCli = await getCFCliToolVersion();

    let toolsExtensions: ToolsExtensions = {
        cloudCli: cloudCli,
        fioriGenVersion: fioriGenVersion
    };

    if (extensions) {
        const extVersions = getExtVersions(extensions);
        toolsExtensions = {
            ...toolsExtensions,
            ...extVersions
        };
    }

    logger.info(t('info.cloudCli', { cloudCli: toolsExtensions.cloudCli }));
    logger.info(t('info.appWizard', { appWizard: toolsExtensions.appWizard }));
    logger.info(t('info.fioriGenVersion', { fioriGenVersion: toolsExtensions.fioriGenVersion }));
    logger.info(t('info.appMod', { appMod: toolsExtensions.appMod }));
    logger.info(t('info.help', { help: toolsExtensions.help }));
    logger.info(t('info.serviceMod', { serviceMod: toolsExtensions.serviceMod }));
    logger.info(t('info.annotationMod', { annotationMod: toolsExtensions.annotationMod }));
    logger.info(t('info.xmlToolkit', { xmlToolkit: toolsExtensions.xmlToolkit }));
    logger.info(t('info.cds', { cds: toolsExtensions.cds }));
    logger.info(t('info.ui5LanguageAssistant', { ui5LanguageAssistant: toolsExtensions.ui5LanguageAssistant }));

    return { toolsExtensions, messages: logger.getMessages() };
}

/**
 * Internal function to check an SAP system.
 *
 * @param sapSystem - the SAP system to get detailed results for
 * @param credentialCallback
 * @returns - messages and detailed destination check results
 */
async function getSapSystemResults(
    sapSystem: SapSystem,
    credentialCallback: (destination: SapSystem) => Promise<{
        username: string;
        password: string;
    }>
): Promise<{ messages: ResultMessage[]; sapSystemResults: SapSystemResults }> {
    const logger = getLogger();
    let username: string;
    let password: string;

    if (needsUsernamePassword(sapSystem)) {
        if (typeof credentialCallback === 'function') {
            const credentials = await credentialCallback(sapSystem);
            if (credentials && credentials.username && credentials.password) {
                username = credentials.username;
                password = credentials.password;
            }
        } else {
            logger.warn(
                t('warning.basicAuthRequired', {
                    sapSystem: sapSystem.Name
                })
            );
        }
    }

    const sapSystemDetails = await checkSapSystem(sapSystem, username, password);
    logger.push(...sapSystemDetails.messages);

    return {
        messages: logger.getMessages(),
        sapSystemResults: sapSystemDetails.sapSystemResults
    };
}

/**
 * Check a set of SAP systems (deep dive into them).
 *
 * @param deepDiveSapSystems - SAP systems selected for a closer look
 * @param sapSystems - array of all SAP systems found
 * @param credentialCallback
 * @returns - messages and the map of detailed SAP systems check results
 */
export async function getSapSystemsResults(
    deepDiveSapSystems: Set<string>,
    sapSystems: SapSystem[],
    credentialCallback?: (destination: SapSystem) => Promise<{
        username: string;
        password: string;
    }>
): Promise<{ messages: ResultMessage[]; systemResults: { [dest: string]: SapSystemResults } }> {
    const logger = getLogger();
    const systemResults: { [system: string]: SapSystemResults } = {};
    logger.info(
        deepDiveSapSystems.size > 0
            ? t('info.detailsForSapSystem', { sapSystems: Array.from(deepDiveSapSystems).join(', ') })
            : t('info.noDetailsRequested')
    );

    for (const deepDiveSapSystem of Array.from(deepDiveSapSystems)) {
        const checkDest = sapSystems.find((d) => d.Name === deepDiveSapSystem);
        if (checkDest) {
            const { messages: destMessages, sapSystemResults } = await getSapSystemResults(
                checkDest,
                credentialCallback
            );
            logger.push(...destMessages);

            systemResults[checkDest.Name] = sapSystemResults;
        } else {
            logger.warn(t('warning.sapSystemsNotFound', { deepDiveSapSystem, sysNumber: sapSystems.length }));
        }
    }

    return {
        messages: logger.getMessages(),
        systemResults
    };
}

/**
 * Check environment includes process.env, list of SAP systems, details about the SAP systems.
 *
 * @param options - see type CheckEnvironmentOptions, includes SAP system for deep dive, workspace roots, ...
 * @returns the result, currently as JSON
 */
export async function checkEnvironment(options?: CheckEnvironmentOptions): Promise<EnvironmentCheckResult> {
    const logger = getLogger();

    let sapSystems: SapSystem[];

    const requestedChecks: Check[] = [];

    // check environment
    requestedChecks.push(Check.Environment);
    const { environment, messages } = await getEnvironment();
    logger.push(...messages);

    const deepDiveSapSystems = options?.sapSystems ? new Set(options.sapSystems) : new Set<string>();

    if (isAppStudio()) {
        if (options?.workspaceRoots?.length > 0) {
            const workspaceResults = await getDestinationsFromWorkspace(options?.workspaceRoots);
            logger.push(...workspaceResults.messages);
            workspaceResults.destinations.forEach((dest) => deepDiveSapSystems.add(dest));
        }
        requestedChecks.push(Check.Destinations);
        const basDestResults = await checkBASDestinations();
        sapSystems = basDestResults.destinations;
        logger.push(...basDestResults.messages);
    } else {
        requestedChecks.push(Check.StoredSystems);
        const savedSystemResults = await checkStoredSystems();
        sapSystems = savedSystemResults.storedSystems;
        logger.push(...savedSystemResults.messages);
    }

    if (deepDiveSapSystems.size > 0) {
        requestedChecks.push(Check.SapSystemResults);
    }

    const sapSysResults = await getSapSystemsResults(deepDiveSapSystems, sapSystems, options?.credentialCallback);
    const sapSystemResults = sapSysResults.systemResults;
    logger.push(...sapSysResults.messages);

    return {
        environment,
        sapSystems,
        sapSystemResults,
        messages: logger.getMessages(),
        requestedChecks: requestedChecks
    };
}
