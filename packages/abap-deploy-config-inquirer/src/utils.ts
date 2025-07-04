import type { Destination, Destinations } from '@sap-ux/btp-utils';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import { getService } from '@sap-ux/store';
import { CREATE_TR_DURING_DEPLOY } from './constants';
import { t } from './i18n';
import LoggerHelper from './logger-helper';
import { getTransportConfigInstance } from './service-provider-utils';
import type {
    AbapDeployConfigAnswers,
    AbapDeployConfigAnswersInternal,
    BackendTarget,
    Credentials,
    InitTransportConfigResult,
    SystemConfig
} from './types';
import { PackageInputChoices, TargetSystemType, TransportChoices } from './types';
import { listPackages } from './validator-utils';

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
        destinations = await listDestinations({
            stripS4HCApiHosts: true
        });
        cachedDestinations = destinations;
    } else {
        const systemStore = await getService<BackendSystem, BackendSystemKey>({
            logger: LoggerHelper.logger,
            entityName: 'system'
        });
        backendSystems = await systemStore?.getAll();
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
            abapSystem.client === client) ||
            (!!abapSystem?.destination && destination === abapSystem?.destination)
    );
}

/**
 * Get transport configuration from the backend.
 *
 * @param transportConfigParams - transport configuration parameters
 * @param transportConfigParams.backendTarget - backend target from prompt options
 * @param transportConfigParams.url - url
 * @param transportConfigParams.client - client
 * @param transportConfigParams.destination - destination
 * @param transportConfigParams.errorHandler - error handler
 * @param transportConfigParams.credentials - user credentials
 * @returns transport configuration
 */
export async function initTransportConfig({
    backendTarget,
    url,
    destination,
    credentials,
    errorHandler
}: {
    backendTarget?: BackendTarget;
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

    try {
        result = await getTransportConfigInstance({
            backendTarget,
            credentials
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
 * @param inputSystemConfig System configuration extracted from user answers for establishing backend connection
 * @param backendTarget - backend target from abap deploy config prompt options
 * @returns list of package names
 */
export async function queryPackages(
    input: string,
    inputSystemConfig: SystemConfig,
    backendTarget?: BackendTarget
): Promise<string[]> {
    const uppercaseInput = (input ?? '').toUpperCase();

    return listPackages(uppercaseInput, inputSystemConfig, backendTarget);
}

/**
 * Determines the package from the various package related prompts.
 *
 * @param previousAnswers - previous answers
 * @param statePackage - package from state
 * @returns package name
 */
export function getPackageAnswer(previousAnswers?: AbapDeployConfigAnswersInternal, statePackage?: string): string {
    return (
        statePackage ??
        (previousAnswers?.packageInputChoice === PackageInputChoices.ListExistingChoice
            ? previousAnswers?.packageAutocomplete ?? ''
            : previousAnswers?.packageManual ?? '')
    );
}

/**
 * Determines the transport request from the various transport related prompts.
 *
 * @param promptAnswers - previous answers
 * @returns transport request
 */
export function getTransportAnswer(promptAnswers?: AbapDeployConfigAnswersInternal): string {
    return (
        promptAnswers?.transportManual ||
        promptAnswers?.transportFromList ||
        promptAnswers?.transportCreated ||
        (promptAnswers?.transportInputChoice === TransportChoices.CreateDuringDeployChoice
            ? CREATE_TR_DURING_DEPLOY
            : '')
    );
}

/**
 * Check if the transport matches placeholder used to create transport request number during actual deploy process.
 *
 * @param transport - existing transport
 * @returns true if transport setting is set to 'CreateDuringDeployChoice'.
 */
export function useCreateTrDuringDeploy(transport?: string): boolean {
    return transport === CREATE_TR_DURING_DEPLOY;
}

/**
 * Determines the url from the various sources.
 *
 * @param answers - internal abap deploy config answers
 * @param stateUrl - url from state
 * @returns url if found
 */
function getUrlAnswer(answers: AbapDeployConfigAnswersInternal, stateUrl?: string): string {
    let url = answers.url;
    if (stateUrl) {
        url = stateUrl;
    }
    return url;
}

/**
 * Convert internal answers to external answers to be used for writing deploy config.
 *
 * @param answers - internal abap deploy config answers, direct from prompting
 * @param state - partial internal abap deploy config answers derived from the state
 * @returns - external abap deploy config answers
 */
export function reconcileAnswers(
    answers: AbapDeployConfigAnswersInternal,
    state: Partial<AbapDeployConfigAnswersInternal>
): AbapDeployConfigAnswers {
    // Add dervied service answers to the answers object
    answers = Object.assign(answers, state);

    const reconciledAnswers: AbapDeployConfigAnswers = {
        url: getUrlAnswer(answers, state.url),
        package: getPackageAnswer(answers, state.package)
    };

    if (answers.destination) {
        reconciledAnswers.destination = answers.destination;
    }

    if (answers.targetSystem && answers.targetSystem !== TargetSystemType.Url) {
        reconciledAnswers.url = answers.targetSystem;
    }

    if (answers.client || state.client) {
        reconciledAnswers.client = answers.client || state.client;
    }

    if (answers.scp || state.scp) {
        reconciledAnswers.scp = true;
    }

    if (answers.ui5AbapRepo) {
        reconciledAnswers.ui5AbapRepo = answers.ui5AbapRepo;
    }

    if (answers.description) {
        reconciledAnswers.description = answers.description;
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

/**
 * If the prompts are being use standalone then the system configuration is derived from the prompt options rather than the state.
 *
 * @param useStandalone - whether the prompts are used standalone
 * @param abapDeployConfig - abap deploy config answers derived from the state i.e system selection prompt answers
 * @param backendTarget - backend target from abap deploy config prompt options
 * @returns system configuration
 */
export function getSystemConfig(
    useStandalone: boolean,
    abapDeployConfig?: Partial<AbapDeployConfigAnswersInternal>,
    backendTarget?: BackendTarget
): SystemConfig {
    const configSource = useStandalone ? backendTarget?.abapTarget : abapDeployConfig;

    return {
        url: configSource?.url,
        client: configSource?.client,
        destination: configSource?.destination
    };
}
