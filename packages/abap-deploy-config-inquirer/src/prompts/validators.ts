import { PromptState } from './prompt-state';
import { type Destinations, isS4HC, isAbapEnvironmentOnBtp } from '@sap-ux/btp-utils';
import {
    createTransportNumber,
    getTransportList,
    isEmptyString,
    isValidClient,
    isValidUrl,
    isAppNameValid
} from '../validator-utils';
import { t } from '../i18n';
import { findBackendSystemByUrl, initTransportConfig, getPackageAnswer, queryPackages } from '../utils';
import { handleErrorMessage } from '../error-handler';
import { AuthenticationType } from '@sap-ux/store';
import { getHostEnvironment, hostEnvironment, getHelpUrl, HELP_TREE } from '@sap-ux/fiori-generator-shared';
import LoggerHelper from '../logger-helper';
import {
    ClientChoiceValue,
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type SystemConfig,
    type AbapDeployConfigAnswers,
    type AbapDeployConfigPromptOptions,
    type AbapSystemChoice
} from '../types';

/**
 * Validates the destination question and sets the destination in the prompt state.
 *
 * @param destination - chosen destination
 * @param destinations - list of destinations
 * @returns boolean
 */
export function validateDestinationQuestion(destination: string, destinations?: Destinations): boolean {
    PromptState.resetAbapDeployConfig();
    updateDestinationPromptState(destination, destinations);
    return true;
}

/**
 * Updates prompt state with the provided configuration.
 *
 * @param props - properties to update
 * @param props.url - url
 * @param props.client - client
 * @param props.isS4HC - is S/4HANA Cloud
 * @param props.scp - is SCP
 */
function updatePromptState({
    url,
    client,
    isS4HC,
    scp
}: {
    url: string;
    client?: string;
    isS4HC?: boolean;
    scp?: boolean;
}): void {
    PromptState.abapDeployConfig.url = url;
    PromptState.abapDeployConfig.client = client;
    PromptState.abapDeployConfig.isS4HC = isS4HC;
    PromptState.abapDeployConfig.scp = scp;
}

/**
 * Updates the destination prompt state.
 *
 * @param destination - destination
 * @param destinations - list of destinations
 */
export function updateDestinationPromptState(destination: string, destinations: Destinations = {}): void {
    const dest = destinations[destination];
    if (dest) {
        PromptState.abapDeployConfig.destination = dest.Name;
        updatePromptState({
            url: dest?.Host,
            client: dest['sap-client'],
            isS4HC: isS4HC(dest),
            scp: isAbapEnvironmentOnBtp(dest)
        });
    }
}

/**
 * Validates the target system.
 *
 * @param target - target system
 * @param choices - abab system choices
 * @returns boolean or error message string
 */
export function validateTargetSystem(target?: string, choices?: AbapSystemChoice[]): boolean | string {
    PromptState.resetAbapDeployConfig();
    if (!target || target === TargetSystemType.Url) {
        return true;
    }
    const isValid = isValidUrl(target?.trim());
    if (isValid === true && choices) {
        const choice = choices.find((choice) => choice.value === target);
        if (choice) {
            updatePromptState({
                url: choice.value,
                client: choice.client ?? '',
                scp: !!choice.scp,
                isS4HC: choice.isS4HC
            });
        }
    }
    return isValid;
}

/**
 * Validates the URL.
 *
 * @param input - url
 * @returns boolean or error message string
 */
export function validateUrl(input: string): boolean | string {
    PromptState.resetAbapDeployConfig();
    if (isEmptyString(input)) {
        return false;
    }
    const result = isValidUrl(input?.trim());
    if (result) {
        const backendSystem = findBackendSystemByUrl(input);
        if (backendSystem) {
            updatePromptState({
                url: backendSystem.url,
                client: backendSystem.client,
                scp: !!backendSystem.serviceKeys,
                isS4HC: backendSystem.authenticationType === AuthenticationType.ReentranceTicket
            });
        }
    } else {
        return t('errors.invalidUrl', { url: input?.trim() });
    }
    return true;
}

/**
 * Validates the target system URL for CLI.
 *
 * @param targetSystem - target system
 * @param choices - abap system choices
 * @throws Error if target system is invalid
 */
export function validateTargetSystemUrlCli(targetSystem?: string, choices?: AbapSystemChoice[]): void {
    if (getHostEnvironment() === hostEnvironment.cli) {
        const isTargetValid = validateTargetSystem(targetSystem, choices);
        if (typeof isTargetValid === 'string') {
            throw new Error(isTargetValid);
        }
    }
}

/**
 * Validates the SCP question and sets the SCP in the prompt state.
 *
 * @param input - if confirm was selected
 * @returns boolean
 */
export function validateScpQuestion(input: boolean): boolean {
    PromptState.abapDeployConfig.scp = input;
    return true;
}

/**
 * Validates and updates the client property in the state.
 *
 * @param options - abap deploy config prompt options
 * @param clientChoice - client choice
 * @returns boolean
 */
export function validateClientChoiceQuestion(
    options: AbapDeployConfigPromptOptions,
    clientChoice: ClientChoiceValue
): boolean {
    switch (clientChoice) {
        case ClientChoiceValue.Base:
            PromptState.abapDeployConfig.client =
                PromptState.abapDeployConfig.client ?? options.backendTarget?.abapTarget.client;
            break;

        case ClientChoiceValue.Blank:
            delete PromptState.abapDeployConfig.client;
            break;

        case ClientChoiceValue.New:
        default:
            break;
    }
    return true;
}

/**
 * Validates the client and sets the client in the prompt state.
 *
 * @param input - client
 * @returns boolean or error message as a string
 */
export function validateClient(input: string): boolean | string {
    const result = isValidClient(input);
    if (result) {
        PromptState.abapDeployConfig.client = input;
        return result;
    } else {
        delete PromptState.abapDeployConfig.client;
        return t('errors.invalidClient', { client: input });
    }
}

/**
 * Validates the credentials.
 *
 * @param options - abap deploy config prompt options
 * @param input - password entered
 * @param previousAnswers - previous answers
 * @returns boolean or error message as a string
 */
export async function validateCredentials(
    options: AbapDeployConfigPromptOptions,
    input: string,
    previousAnswers: AbapDeployConfigAnswers
): Promise<boolean | string> {
    if (!input || !previousAnswers.username) {
        return t('errors.requireCredentials');
    }

    let warning: unknown;
    ({
        transportConfig: PromptState.transportAnswers.transportConfig,
        transportConfigNeedsCreds: PromptState.transportAnswers.transportConfigNeedsCreds,
        warning
    } = await initTransportConfig({
        options: options,
        scp: PromptState.abapDeployConfig.scp,
        url: PromptState.abapDeployConfig.url,
        client: PromptState.abapDeployConfig.client,
        credentials: {
            username: previousAnswers.username,
            password: input
        },
        errorHandler: (e: string) => {
            handleErrorMessage(e);
        }
    }));

    if (warning) {
        const helpLink = getHelpUrl(HELP_TREE.FIORI_TOOLS, [57266]);
        const warningMessage = t('warnings.transportConfigFailure', { helpLink });
        LoggerHelper.logger.info(`\n${warningMessage}`);
        LoggerHelper.logger.info(`\n${warning}`);
        PromptState.transportAnswers.transportConfigNeedsCreds = false;

        return true; // Log a warning and proceed
    }

    if (PromptState.transportAnswers.transportConfigNeedsCreds) {
        LoggerHelper.logger.warn(t('errors.incorrectCredentials'));
        return t('errors.incorrectCredentials');
    } else {
        LoggerHelper.logger.info(t('info.correctCredentials'));
        return true;
    }
}

/**
 * Validates the ui5 app repository name.
 *
 * @param input - ui5 app repository name entered
 * @returns boolean or error message as a string
 */
export function validateUi5AbapRepoName(input: string): boolean | string {
    if (PromptState.transportAnswers.transportConfigError) {
        return t('errors.targetNotDeployable', {
            systemError: PromptState.transportAnswers.transportConfigError
        });
    }

    const result = isAppNameValid(input);

    if (result?.valid) {
        return result?.valid;
    } else {
        return result?.errorMessage ?? t('errors.validators.appNameInvalid');
    }
}

/**
 * Validates the app description.
 *
 * @param input - app description entered
 * @returns boolean or error message as a string
 */
export function validateAppDescription(input: string): boolean | string {
    if (input.length > 60) {
        return t('errors.validators.descriptionLength');
    }
    return true;
}

/**
 * Makes an empty string package query to test connectivity if searching, otherwise returns true.
 *
 * @param input - package input choice
 * @param options - abap deploy config prompt options
 * @param systemConfig - system configuration
 * @returns boolean or error message as a string
 */
export async function validatePackageChoiceInput(
    input: PackageInputChoices,
    options: AbapDeployConfigPromptOptions,
    systemConfig: SystemConfig
): Promise<boolean | string> {
    if (input === PackageInputChoices.ListExistingChoice) {
        const retrievedPackageList = await queryPackages('', options, systemConfig);
        if (retrievedPackageList && retrievedPackageList.length > 0) {
            return true;
        } else {
            return t('warnings.packageNotFound');
        }
    } else {
        return true;
    }
}

/**
 * This function is used to validate if user choice of providing package name is valid.
 * The validation attempts to connect to backend ADT service to see if it is able to fetch package names.
 *
 * @param options - abap deploy config prompt options
 * @param systemConfig - system configuration
 * @param inputChoice - user choice of how to provide package name
 */
export async function validatePackageChoiceInputForCli(
    options: AbapDeployConfigPromptOptions,
    systemConfig: SystemConfig,
    inputChoice?: PackageInputChoices
): Promise<void> {
    if (inputChoice) {
        const result = await validatePackageChoiceInput(inputChoice, options, systemConfig);
        if (result !== true) {
            throw new Error(result as string);
        }
    }
}

/**
 * Validates the package name.
 *
 * @param input - package name entered
 * @returns boolean or error message as a string
 */
export function validatePackage(input: string): boolean | string {
    if (!input?.trim()) {
        return t('warnings.providePackage');
    }
    return true;
}

/**
 * Handler for creating new transport choices.
 *
 * @param packageAnswer - package name
 * @param options - abap deploy config prompt options
 * @param systemConfig - system configuration
 * @param input - transport choice input
 * @param previousAnswers - previous answers
 * @param validateInputChanged - if the input has changed
 * @param prevTransportInputChoice - previous transport input choice
 * @returns - boolean or error message as a string
 */
async function handleCreateNewTransportChoice(
    packageAnswer: string,
    options: AbapDeployConfigPromptOptions,
    systemConfig: SystemConfig,
    input?: TransportChoices,
    previousAnswers?: AbapDeployConfigAnswers,
    validateInputChanged?: boolean,
    prevTransportInputChoice?: TransportChoices
): Promise<boolean | string> {
    // Question is re-evaluated triggered by other user changes,
    // no need to create a new transport number
    if (validateInputChanged) {
        if (input === prevTransportInputChoice) {
            return true;
        } else if (!prevTransportInputChoice) {
            // if prevTransportInputChoice is undefined (occurs after back navigation)
            // take most recent entry in transport list
            const list = await getTransportList(
                packageAnswer,
                previousAnswers?.ui5AbapRepo ?? '',
                options,
                systemConfig
            );
            if (list?.[0]) {
                PromptState.transportAnswers.newTransportNumber = list[0].transportReqNumber;
                return true;
            }
        }
    }
    const description = `For ABAP repository ${previousAnswers?.ui5AbapRepo?.toUpperCase()}, created by SAP Fiori Tools`;
    PromptState.transportAnswers.newTransportNumber = await createTransportNumber(
        {
            packageName: getPackageAnswer(previousAnswers),
            ui5AppName: previousAnswers?.ui5AbapRepo ?? '',
            description: description.length > 60 ? description.slice(0, 57) + '...' : description
        },
        options,
        systemConfig
    );
    if (PromptState.transportAnswers.newTransportNumber) {
        return true;
    } else {
        return t('errors.createTransportReqFailed');
    }
}

/**
 * Handler for listing the transport choices.
 *
 * @param packageAnswer - package name
 * @param options - abap deploy config prompt options
 * @param systemConfig - system configuration
 * @param previousAnswers - previous answers
 * @returns - boolean or error message as a string
 */
async function handleListExistingTransportChoice(
    packageAnswer: string,
    options: AbapDeployConfigPromptOptions,
    systemConfig: SystemConfig,
    previousAnswers?: AbapDeployConfigAnswers
): Promise<boolean | string> {
    if (!packageAnswer || !previousAnswers?.ui5AbapRepo) {
        return t('errors.validators.transportListPreReqs');
    }

    PromptState.transportAnswers.transportList = await getTransportList(
        packageAnswer,
        previousAnswers.ui5AbapRepo,
        options,
        systemConfig
    );
    if (PromptState.transportAnswers.transportList) {
        if (PromptState.transportAnswers.transportList.length > 0) {
            return true;
        } else {
            return t('warnings.noTransportReqs');
        }
    } else {
        return t('warnings.noExistingTransportReqList');
    }
}

/**
 * Validates the transport choice input.
 *
 * @param input - transport choice input
 * @param options - abap deploy config prompt options
 * @param previousAnswers - previous answers
 * @param validateInputChanged - if the input has changed
 * @param prevTransportInputChoice - previous transport input choice
 * @returns boolean or error message as a string
 */
export async function validateTransportChoiceInput(
    input?: TransportChoices,
    options: AbapDeployConfigPromptOptions = {},
    previousAnswers?: AbapDeployConfigAnswers,
    validateInputChanged?: boolean,
    prevTransportInputChoice?: TransportChoices
): Promise<boolean | string> {
    const packageAnswer = getPackageAnswer(previousAnswers);
    const systemConfig: SystemConfig = {
        url: PromptState.abapDeployConfig.url,
        client: PromptState.abapDeployConfig.client,
        destination: PromptState.abapDeployConfig.destination
    };

    switch (input) {
        case TransportChoices.ListExistingChoice: {
            return handleListExistingTransportChoice(packageAnswer, options, systemConfig, previousAnswers);
        }
        case TransportChoices.CreateNewChoice: {
            return handleCreateNewTransportChoice(
                packageAnswer,
                options,
                systemConfig,
                input,
                previousAnswers,
                validateInputChanged,
                prevTransportInputChoice
            );
        }
        case TransportChoices.EnterManualChoice:
        default:
            return true;
    }
}

/**
 * Validates the transport question.
 *
 * @param input - transport request
 * @param previousAnswers - previous answers
 * @returns boolean or error message as a string
 */
export function validateTransportQuestion(input: string, previousAnswers?: AbapDeployConfigAnswers): boolean | string {
    const packageAnswer = getPackageAnswer(previousAnswers);
    if (!/^[$LlTt]/.exec(packageAnswer) && !input?.trim()) {
        return t('prompts.config.transport.provideTransportRequest');
    }
    return true;
}

/**
 * Validates the confirm question and updates the state.
 *
 * @param overwrite - if overwrite was selected
 * @returns boolean
 */
export function validateConfirmQuestion(overwrite: boolean): boolean {
    PromptState.abapDeployConfig.abort = !overwrite;
    return true;
}
