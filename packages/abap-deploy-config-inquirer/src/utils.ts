import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { getService } from '@sap-ux/store';
import { PackageInputChoices, TargetSystemType, TransportChoices } from './types';
import { getTransportConfigInstance } from './service-provider-utils';
import { t } from './i18n';
import LoggerHelper from './logger-helper';
import { listPackages } from './validator-utils';
import type {
    AbapDeployConfigAnswers,
    AbapDeployConfigAnswersInternal,
    AbapDeployConfigPromptOptions,
    Credentials,
    InitTransportConfigResult,
    SystemConfig
} from './types';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import type { Destinations, Destination } from '@sap-ux/btp-utils';
import { CREATE_TR_DURING_DEPLOY } from './constants';
import { PromptState } from './prompts/prompt-state';

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
export function getPackageAnswer(previousAnswers?: AbapDeployConfigAnswersInternal): string {
    // Older versions of YUI do not have a packageInputChoice question
    return PromptState.abapDeployConfig.package ??
        previousAnswers?.packageInputChoice === PackageInputChoices.ListExistingChoice
        ? previousAnswers?.packageAutocomplete ?? ''
        : previousAnswers?.packageManual ?? '';
}

/**
 * Determines the transport request from the various transport related prompts.
 *
 * @param previousAnswers - previous answers
 * @returns transport request
 */
export function getTransportAnswer(previousAnswers?: AbapDeployConfigAnswersInternal): string {
    return (
        previousAnswers?.transportManual ||
        previousAnswers?.transportFromList ||
        previousAnswers?.transportCreated ||
        (previousAnswers?.transportInputChoice === TransportChoices.CreateDuringDeployChoice
            ? CREATE_TR_DURING_DEPLOY
            : '')
    );
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

/**
 * Determines the url from the various sources.
 *
 * @param answers - internal abap deploy config answers
 * @returns url if found
 */
function getUrlAnswer(answers: AbapDeployConfigAnswersInternal): string | undefined {
    let url;
    if (answers.targetSystem && answers.targetSystem === TargetSystemType.Url && answers.url) {
        url = answers.url;
    } else if (PromptState.abapDeployConfig.url) {
        url = PromptState.abapDeployConfig.url;
    }
    return url;
}
/**
 * Convert internal answers to external answers to be used for writing deploy config.
 *
 * @param answers - internal abap deploy config answers
 * @returns - external abap deploy config answers
 */
export function reconcileAnswers(answers: AbapDeployConfigAnswersInternal): AbapDeployConfigAnswers {
    const reconciledAnswers: AbapDeployConfigAnswers = {};
    if (answers.destination) {
        reconciledAnswers.destination = answers.destination;
    }

    if (answers.targetSystem && answers.targetSystem !== TargetSystemType.Url) {
        reconciledAnswers.url = answers.targetSystem;
    }

    const url = getUrlAnswer(answers);
    if (url) {
        reconciledAnswers.url = url;
    }

    if (answers.client || PromptState.abapDeployConfig.client) {
        reconciledAnswers.client = answers.client ?? PromptState.abapDeployConfig.client;
    }

    if (answers.scp || PromptState.abapDeployConfig.scp) {
        reconciledAnswers.scp = true;
    }

    if (answers.ui5AbapRepo) {
        reconciledAnswers.ui5AbapRepo = answers.ui5AbapRepo;
    }

    if (answers.description) {
        reconciledAnswers.description = answers.description;
    }

    const packageAnswer = getPackageAnswer(answers);
    if (packageAnswer) {
        reconciledAnswers.package = packageAnswer;
    }

    const transportAnswer = getTransportAnswer(answers);
    if (transportAnswer) {
        reconciledAnswers.transport = transportAnswer;
    }

    if (answers.index !== undefined) {
        reconciledAnswers.index = answers.index;
    }

    if (answers.overwrite !== undefined) {
        reconciledAnswers.overwrite = answers.overwrite;
    }

    return reconciledAnswers;
}
