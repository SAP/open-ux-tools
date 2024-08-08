import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { getService } from '@sap-ux/store';
import { PackageInputChoices } from './types';
import { getTransportConfigInstance } from './service-provider-utils';
import { t } from './i18n';
import LoggerHelper from './logger-helper';
import { listPackages } from './validator-utils';
import type {
    AbapDeployConfigAnswers,
    AbapDeployConfigPromptOptions,
    Credentials,
    InitTransportConfigResult,
    SystemConfig
} from './types';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import type { Destinations, Destination } from '@sap-ux/btp-utils';
import { CREATE_TR_DURING_DEPLOY } from './constants';

let cachedDestinations: Destinations = {};
let cachedBackendSystems: BackendSystem[] = [];

/**
 * Retrieve the ABAP systems from the store or the destinations from BTP.
 *
 * @returns destinations or backend systems from the store
 */
export async function getAbapSystems(): Promise<{
    destinations: Destinations | undefined;
    backendSystems: BackendSystem[] | undefined;
}> {
    let destinations;
    let backendSystems;

    if (isAppStudio()) {
        destinations = await listDestinations();
        cachedDestinations = destinations;
    } else {
        const systemStore = await getService<BackendSystem, BackendSystemKey>({
            logger: LoggerHelper.logger,
            entityName: 'system'
        });
        backendSystems = await systemStore.getAll();
        cachedBackendSystems = backendSystems;
    }

    return { destinations, backendSystems };
}

/**
 * Retrieve a specific Destination, based on the destination name.
 *
 * @param destination - destination name
 * @returns destination if found
 */
export function findDestination(destination: string): Destination | undefined {
    return cachedDestinations?.[destination];
}

/**
 * Retrieve a specific BackendSystem, based on the URL.
 *
 * @param backendUrl - backend system URL
 * @returns backend system if found
 */
export function findBackendSystemByUrl(backendUrl: string): BackendSystem | undefined {
    return cachedBackendSystems?.find((backend: BackendSystem) => backend.url === backendUrl);
}

/**
 * Check if the current system is the same as the one in the answers.
 *
 * @param abapSystem - system configuration
 * @param url - url
 * @param client - client
 * @param destination - destination
 * @returns true if the system is the same
 */
export function isSameSystem(abapSystem?: SystemConfig, url?: string, client?: string, destination?: string): boolean {
    return Boolean(
        (abapSystem?.url &&
            abapSystem.url.trim()?.replace(/\/$/, '') === url?.trim()?.replace(/\/$/, '') &&
            abapSystem.client === client) ??
            (!!abapSystem?.destination && destination === abapSystem?.destination)
    );
}

/**
 * Get transport configuration from the backend.
 *
 * @param transportConfigParams - transport configuration parameters
 * @param transportConfigParams.options - abap deploy config prompt options
 * @param transportConfigParams.scp - scp
 * @param transportConfigParams.url - url
 * @param transportConfigParams.client - client
 * @param transportConfigParams.destination - destination
 * @param transportConfigParams.errorHandler - error handler
 * @param transportConfigParams.credentials - user credentials
 * @returns transport configuration
 */
export async function initTransportConfig({
    options,
    scp,
    url,
    client,
    destination,
    credentials,
    errorHandler
}: {
    options: AbapDeployConfigPromptOptions;
    scp?: boolean;
    url?: string;
    client?: string;
    destination?: string;
    credentials?: Credentials;
    errorHandler: (errorMessage: string) => void;
}): Promise<InitTransportConfigResult> {
    let result: InitTransportConfigResult = {};
    if (!url && !destination) {
        return result;
    }

    const systemConfig = {
        url,
        client,
        destination
    };

    try {
        result = await getTransportConfigInstance({
            options,
            scp,
            credentials,
            systemConfig
        });
    } catch (e) {
        result.error = e;
    }

    if (result.error) {
        errorHandler(result.error);
        LoggerHelper.logger.debug(
            t('errors.debugAbapTargetSystem', { method: 'initTransportConfig', error: result.error })
        );
    }

    return result;
}

/**
 * Querying package names that match the user input.
 *
 * @param input - user input
 * @param options - abap deploy config prompt options
 * @param inputSystemConfig System configuration extracted from user answers for establishing backend connection
 * @returns list of package names
 */
export async function queryPackages(
    input: string,
    options: AbapDeployConfigPromptOptions,
    inputSystemConfig: SystemConfig
): Promise<string[]> {
    const uppercaseInput = (input ?? '').toUpperCase();
    return listPackages(uppercaseInput, options, inputSystemConfig);
}

/**
 * Determines the package from the various package related prompts.
 *
 * @param previousAnswers - previous answers
 * @returns package name
 */
export function getPackageAnswer(previousAnswers?: AbapDeployConfigAnswers): string {
    // Older versions of YUI do not have a packageInputChoice question
    return previousAnswers?.packageInputChoice === PackageInputChoices.ListExistingChoice
        ? previousAnswers?.packageAutocomplete ?? ''
        : previousAnswers?.packageManual ?? '';
}

/**
 * If a deploy config already exists in the project, check if the config
 * uses option to create transport request number during actual deploy process.
 *
 * @param options ABAP Deploy prompt options
 * @returns True if transport setting is set to 'CreateDuringDeployChoice'.
 */
export function useCreateTrDuringDeploy(options: AbapDeployConfigPromptOptions): boolean {
    return options.existingDeployTaskConfig?.transport === CREATE_TR_DURING_DEPLOY;
}
