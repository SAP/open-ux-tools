import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
import { AdaptationProjectType, isAxiosError, type SystemInfo } from '@sap-ux/axios-extension';
import { isAbapEnvironmentOnBtp, isS4HC, type Destinations } from '@sap-ux/btp-utils';
import { ErrorHandler } from '@sap-ux/inquirer-common';
import { AuthenticationType } from '@sap-ux/store';
import { DEFAULT_PACKAGE_ABAP } from '../constants';
import { handleTransportConfigError } from '../error-handler';
import { t } from '../i18n';
import LoggerHelper from '../logger-helper';
import { getTransportListFromService } from '../service-provider-utils';
import { AbapServiceProviderManager } from '../service-provider-utils/abap-service-provider';
import {
    ClientChoiceValue,
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type AbapDeployConfigAnswersInternal,
    type AbapSystemChoice,
    type BackendTarget,
    type PackagePromptOptions,
    type SystemConfig,
    type UI5AbapRepoPromptOptions
} from '../types';
import {
    findBackendSystemByUrl,
    getPackageAnswer,
    getSystemConfig,
    initTransportConfig,
    queryPackages
} from '../utils';
import {
    createTransportNumber,
    getTransportList,
    isAppNameValid,
    isEmptyString,
    isValidClient,
    isValidUrl
} from '../validator-utils';
import { PromptState } from './prompt-state';

const allowedPackagePrefixes = ['$', 'Z', 'Y', 'SAP'];

/**
 * Validates the destination question and sets the destination in the prompt state.
 *
 * @param destination - chosen destination
 * @param destinations - list of destinations
 * @param backendTarget - backend target
 * @param adpProjectType - The adaptation project type.
 * @returns boolean
 */
export async function validateDestinationQuestion(
    destination: string,
    destinations?: Destinations,
    backendTarget?: BackendTarget,
    adpProjectType?: AdaptationProjectType
): Promise<boolean | string> {
    PromptState.resetAbapDeployConfig();
    updateDestinationPromptState(destination, destinations);

    const adpProjectTypeValidation = await validateSystemSupportAdpProjectType(adpProjectType, backendTarget);
    if (typeof adpProjectTypeValidation === 'string') {
        return adpProjectTypeValidation;
    }

    return !!destination?.trim();
}

/**
 * Updates prompt state with the provided configuration.
 *
 * @param props - properties to update
 * @param props.url - url
 * @param props.client - client
 * @param props.isAbapCloud - Cloud based Abap (either Steampunk or Embedded Steampunk)
 * @param props.scp - is SCP
 * @param props.target - target system
 */
function updatePromptState({
    url,
    client,
    isAbapCloud,
    scp,
    target
}: {
    url: string;
    client?: string;
    isAbapCloud?: boolean;
    scp?: boolean;
    target?: string;
}): void {
    PromptState.abapDeployConfig.url = url;
    PromptState.abapDeployConfig.client = client;
    PromptState.abapDeployConfig.isAbapCloud = isAbapCloud;
    PromptState.abapDeployConfig.scp = scp;
    PromptState.abapDeployConfig.targetSystem = target;
}

/**
 * Updates the destination prompt state.
 *
 * @param destinationName - The destination name.
 * @param destinations - Map organizing destinations by name.
 */
export function updateDestinationPromptState(destinationName: string, destinations: Destinations = {}): void {
    const destination = destinations[destinationName];
    if (!destination) {
        return;
    }
    PromptState.abapDeployConfig.destination = destination.Name;
    updatePromptState({
        url: destination?.Host,
        client: destination['sap-client'],
        isAbapCloud: isS4HC(destination),
        scp: isAbapEnvironmentOnBtp(destination)
    });
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

    const choice = choices?.find((choice) => choice.value === target);
    if (isValid && choice) {
        updatePromptState({
            url: choice.value,
            client: choice.client ?? '',
            scp: choice.scp,
            isAbapCloud: choice.isAbapCloud,
            target: target
        });
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
        updatePromptState({
            url: input.trim(),
            client: backendSystem?.client,
            scp: !!backendSystem?.serviceKeys,
            isAbapCloud: backendSystem?.authenticationType === AuthenticationType.ReentranceTicket
        });
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
    if (!PromptState.isYUI) {
        const isTargetValid = validateTargetSystem(targetSystem, choices);
        if (typeof isTargetValid === 'string') {
            throw new Error(isTargetValid);
        }
    }
}

/**
 * Validates and updates the client property in the state.
 *
 * @param clientChoice - client choice
 * @param client - client from backend config
 * @returns boolean
 */
export function validateClientChoiceQuestion(clientChoice: ClientChoiceValue, client?: string): boolean {
    switch (clientChoice) {
        case ClientChoiceValue.Base:
            PromptState.abapDeployConfig.client =
                (PromptState.abapDeployConfig?.client as string) ?? (client as string); // Parsing of YAML documents can result in a double quoted property being parsed as a string
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
 * @param client - client
 * @returns boolean or error message as a string
 */
export function validateClient(client: string): boolean | string {
    if (!client) {
        return true;
    }
    const tmpClient = String(client);
    const result = isValidClient(tmpClient);
    if (result) {
        PromptState.abapDeployConfig.client = tmpClient;
        return result;
    } else {
        delete PromptState.abapDeployConfig.client;
        return t('errors.invalidClient', { client });
    }
}

/**
 * Validates the credentials.
 *
 * @param input - password entered
 * @param previousAnswers - previous answers
 * @param backendTarget - backend target from abap deploy config prompt options
 * @param adpProjectType - The adaptation project type.
 * @returns boolean or error message as a string
 */
export async function validateCredentials(
    input: string,
    previousAnswers: AbapDeployConfigAnswersInternal,
    backendTarget?: BackendTarget,
    adpProjectType?: AdaptationProjectType
): Promise<boolean | string> {
    if (!input || !previousAnswers.username) {
        return t('errors.requireCredentials');
    }

    const { transportConfigNeedsCreds } = await initTransportConfig({
        backendTarget: backendTarget,
        url: PromptState.abapDeployConfig.url,
        client: PromptState.abapDeployConfig.client,
        credentials: {
            username: previousAnswers.username,
            password: input
        },
        errorHandler: (e: string) => {
            handleTransportConfigError(e);
        }
    });

    PromptState.transportAnswers.transportConfigNeedsCreds = transportConfigNeedsCreds ?? false;

    const adpProjectTypeValidation = await validateSystemSupportAdpProjectType(adpProjectType, backendTarget);
    if (typeof adpProjectTypeValidation === 'string') {
        return adpProjectTypeValidation;
    }

    return transportConfigNeedsCreds ? t('errors.incorrectCredentials') : true;
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
        return result.valid;
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
    if (input?.length > 60) {
        return t('errors.validators.descriptionLength');
    }
    return true;
}

/**
 * Makes an empty string package query to test connectivity if searching, otherwise returns true.
 *
 * @param input - package input choice
 * @param systemConfig - system configuration
 * @param backendTarget - backend target from abap deploy config prompt options
 * @returns boolean or error message as a string
 */
export async function validatePackageChoiceInput(
    input: PackageInputChoices,
    systemConfig: SystemConfig,
    backendTarget?: BackendTarget
): Promise<boolean | string | IValidationLink> {
    if (input === PackageInputChoices.ListExistingChoice) {
        let helpLink: IValidationLink | string | undefined;
        try {
            const retrievedPackageList = await queryPackages('', systemConfig, backendTarget);
            if (retrievedPackageList && retrievedPackageList.length > 0) {
                return true;
            } else {
                return t('warnings.packageNotFound');
            }
        } catch (error) {
            if (ErrorHandler.isCertError(error)) {
                helpLink = new ErrorHandler(
                    undefined,
                    undefined,
                    '@sap-ux/abap-deploy-config-inquirer'
                ).getValidationErrorHelp(error);
                return helpLink ?? true;
            }
            throw error;
        }
    }
    return true;
}

/**
 * This function is used to validate if user choice of providing package name is valid.
 * The validation attempts to connect to backend ADT service to see if it is able to fetch package names.
 *
 * @param systemConfig - system configuration
 * @param inputChoice - user choice of how to provide package name
 * @param backendTarget - backend target from abap deploy config prompt options
 */
export async function validatePackageChoiceInputForCli(
    systemConfig: SystemConfig,
    inputChoice?: PackageInputChoices,
    backendTarget?: BackendTarget
): Promise<void> {
    if (inputChoice) {
        const result = await validatePackageChoiceInput(inputChoice, systemConfig, backendTarget);
        if (result !== true) {
            throw new Error(result as string);
        }
    }
}

/**
 * Determines the starting prefix of a package name.
 *
 * - If the package name is in the form `/namespace/PackageName`, it extracts the namespace as the prefix.
 * - Otherwise, if the package name starts with "SAP" or "$", "Z", "Y", it returns it".
 * - If none of the above, it uses the first character of the package name.
 *
 * @param {string} packageName - The name of the package to analyze.
 * @returns {string} - The starting prefix of the package name.
 */
function getPackageStartingPrefix(packageName: string): string {
    if (/^\/.*\/\w*$/g.test(packageName)) {
        const splitNames = packageName.split('/');
        return `/${splitNames[1]}/`;
    }
    return packageName.startsWith('SAP') ? 'SAP' : packageName[0];
}

/**
 * Handler for creating new transport choices.
 *
 * @param params - parameters for creating new transports
 * @param params.packageAnswer - package name
 * @param params.systemConfig - system configuration
 * @param params.input - transport choice input
 * @param params.previousAnswers - previous answers
 * @param params.validateInputChanged - if the input has changed
 * @param params.prevTransportInputChoice - previous transport input choice
 * @param params.backendTarget - backend target
 * @param params.ui5AbapRepoName - ui5 app repository name derived from AbapDeployConfigPromptOptions[ui5AbapRepo]
 * @param params.transportDescription - custom description for the transport request
 * @returns - boolean or error message as a string
 */
async function handleCreateNewTransportChoice({
    packageAnswer,
    systemConfig,
    input,
    previousAnswers,
    validateInputChanged,
    prevTransportInputChoice,
    backendTarget,
    ui5AbapRepoName,
    transportDescription
}: {
    packageAnswer: string;
    systemConfig: SystemConfig;
    input?: TransportChoices;
    previousAnswers?: AbapDeployConfigAnswersInternal;
    validateInputChanged?: boolean;
    prevTransportInputChoice?: TransportChoices;
    backendTarget?: BackendTarget;
    ui5AbapRepoName?: string;
    transportDescription?: string;
}): Promise<boolean | string> {
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
                previousAnswers?.ui5AbapRepo ?? ui5AbapRepoName ?? '',
                systemConfig,
                backendTarget
            );
            if (list?.[0]) {
                PromptState.transportAnswers.newTransportNumber = list[0].transportReqNumber;
                return true;
            }
        }
    }
    const description =
        transportDescription ??
        `For ABAP repository ${previousAnswers?.ui5AbapRepo?.toUpperCase()}, created by SAP Fiori Tools`;

    PromptState.transportAnswers.newTransportNumber = await createTransportNumber(
        {
            packageName: getPackageAnswer(previousAnswers, PromptState.abapDeployConfig.package),
            ui5AppName: previousAnswers?.ui5AbapRepo ?? '',
            description: description.length > 60 ? description.slice(0, 57) + '...' : description
        },
        systemConfig,
        backendTarget
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
 * @param systemConfig - system configuration
 * @param previousAnswers - previous answers
 * @param backendTarget - backend target
 * @param ui5AbapRepoName - ui5 app repository name derived from AbapDeployConfigPromptOptions[ui5AbapRepo]
 * @returns - boolean or error message as a string
 */
async function handleListExistingTransportChoice(
    packageAnswer: string,
    systemConfig: SystemConfig,
    previousAnswers?: AbapDeployConfigAnswersInternal,
    backendTarget?: BackendTarget,
    ui5AbapRepoName?: string
): Promise<boolean | string> {
    if (!packageAnswer || (!previousAnswers?.ui5AbapRepo && !ui5AbapRepoName)) {
        return t('errors.validators.transportListPreReqs');
    }

    PromptState.transportAnswers.transportList = await getTransportList(
        packageAnswer,
        previousAnswers?.ui5AbapRepo ?? ui5AbapRepoName ?? '',
        systemConfig,
        backendTarget
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
 * @param params - params for transport choice input
 * @param params.useStandalone - if the transport prompts are used standalone
 * @param params.input - transport choice input
 * @param params.previousAnswers - previous answers
 * @param params.validateInputChanged - if the input has changed
 * @param params.prevTransportInputChoice - previous transport input choice
 * @param params.backendTarget - backend target
 * @param params.ui5AbapRepoName - ui5 app repository name derived from AbapDeployConfigPromptOptions[ui5AbapRepo]
 * @param params.transportDescription - custom description for the transport request
 * @returns boolean or error message as a string
 */
export async function validateTransportChoiceInput({
    useStandalone,
    input,
    previousAnswers,
    validateInputChanged,
    prevTransportInputChoice,
    backendTarget,
    ui5AbapRepoName,
    transportDescription
}: {
    useStandalone: boolean;
    input?: TransportChoices;
    previousAnswers?: AbapDeployConfigAnswersInternal;
    validateInputChanged?: boolean;
    prevTransportInputChoice?: TransportChoices;
    backendTarget?: BackendTarget;
    ui5AbapRepoName?: string;
    transportDescription?: string;
}): Promise<boolean | string | IValidationLink> {
    const packageAnswer = getPackageAnswer(previousAnswers, PromptState.abapDeployConfig.package);
    const systemConfig = getSystemConfig(useStandalone, PromptState.abapDeployConfig, backendTarget);

    if (input === TransportChoices.ListExistingChoice) {
        try {
            return await handleListExistingTransportChoice(
                packageAnswer,
                systemConfig,
                previousAnswers,
                backendTarget,
                ui5AbapRepoName
            );
        } catch (error) {
            if (ErrorHandler.isCertError(error)) {
                return (
                    new ErrorHandler(
                        undefined,
                        undefined,
                        '@sap-ux/abap-deploy-config-inquirer'
                    ).getValidationErrorHelp(error) ?? true
                );
            }
        }
    } else if (input === TransportChoices.CreateNewChoice) {
        return await handleCreateNewTransportChoice({
            packageAnswer,
            systemConfig,
            input,
            previousAnswers,
            validateInputChanged,
            prevTransportInputChoice,
            backendTarget,
            ui5AbapRepoName,
            transportDescription
        });
    }
    return true;
}

/**
 * Validates the transport question.
 *
 * @param input - transport request
 * @returns boolean or error message as a string
 */
export function validateTransportQuestion(input?: string): boolean | string {
    if (PromptState.transportAnswers.transportRequired && !input?.trim()) {
        return t('prompts.config.transport.common.provideTransportRequest');
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

/**
 * Checks if the given package is a cloud-ready package.
 *
 * - Fetches system information for the package using the provided system configuration and backend target.
 * - Validates whether the adaptation project type for the package is "CLOUD_READY".
 *
 * @param {string} input - The name of the package to validate.
 * @param {BackendTarget} [backendTarget] - Optional backend target for further system validation.
 * @param {AdaptationProjectType | undefined} adpProjectType - The project type.
 * @returns {Promise<boolean>} - Resolves to `true` if the package is cloud-ready, `false` otherwise.
 */
async function validatePackageType(
    input: string,
    backendTarget?: BackendTarget,
    adpProjectType?: AdaptationProjectType
): Promise<boolean | string> {
    try {
        if (adpProjectType === AdaptationProjectType.ON_PREMISE) {
            LoggerHelper.logger.debug(`Project is OnPremise, skipping package "${input}" type validation`);
            return true;
        }

        const { adaptationProjectTypes } = await getSystemInfo(input, backendTarget);

        const isValidPackage =
            adaptationProjectTypes.length > 1 || adaptationProjectTypes[0] === AdaptationProjectType.CLOUD_READY;

        return isValidPackage ? true : t('errors.validators.invalidCloudPackage');
    } catch (error) {
        // If the api is missing return true.
        if (isAxiosError(error) && error.response?.status === 404) {
            return true;
        }
        return t('errors.validators.invalidCloudPackage');
    }
}

/**
 * Validates a package with extended criteria based on provided options and configurations.
 *
 * @param {string} input - The name of the package to validate.
 * @param {AbapDeployConfigAnswersInternal} answers - Configuration answers for ABAP deployment.
 * @param {PackagePromptOptions} [promptOption] - Optional settings for additional package validation.
 * @param {UI5AbapRepoPromptOptions} [ui5AbapPromptOptions] - Optional for ui5AbapRepo.
 * @param {BackendTarget} [backendTarget] - The backend target for validation context.
 * @param {boolean} [useStandalone] - indicates if the package prompts are being ran in standalone.
 * @param {AdaptationProjectType | undefined} adpProjectType - The adaptation project type.
 * @returns {Promise<boolean | string>} - Resolves to `true` if the package is valid,
 *                                        a `string` with an error message if validation fails,
 *                                        or the result of additional cloud package validation if applicable.
 */
export async function validatePackage(
    input: string,
    answers: AbapDeployConfigAnswersInternal,
    promptOption?: PackagePromptOptions,
    ui5AbapPromptOptions?: UI5AbapRepoPromptOptions,
    backendTarget?: BackendTarget,
    useStandalone?: boolean,
    adpProjectType?: AdaptationProjectType
): Promise<boolean | string> {
    PromptState.transportAnswers.transportRequired = true; // reset to true every time package is validated
    if (!input?.trim()) {
        return t('warnings.providePackage');
    }

    if (input === DEFAULT_PACKAGE_ABAP) {
        PromptState.transportAnswers.transportRequired = false;
        if (
            !promptOption?.additionalValidation ||
            (promptOption?.additionalValidation?.shouldValidatePackageForStartingPrefix === false &&
                promptOption?.additionalValidation?.shouldValidatePackageType === false)
        ) {
            return true;
        }
    }

    const formatAndSpecialCharsValidation = validatePackageFormatAndSpecialCharacters(input, promptOption);
    if (typeof formatAndSpecialCharsValidation === 'string') {
        return formatAndSpecialCharsValidation;
    }

    if (
        useStandalone ||
        !PromptState.abapDeployConfig.scp ||
        // we need to verify cloud systems are connected before checking the package to avoid multiple browser windows opening
        (PromptState.abapDeployConfig.scp && AbapServiceProviderManager.isConnected())
    ) {
        try {
            // checks if package is a local package and will update prompt state accordingly
            await getTransportListFromService(input.toUpperCase(), answers.ui5AbapRepo ?? '', backendTarget);
        } catch (error) {
            LoggerHelper.logger.warn(
                `An error occurred while validating the local package for package: ${error.message}`
            );
        }
    }

    const startingPrefixValidation = validatePackageStartingPrefix(input, answers, promptOption, ui5AbapPromptOptions);
    if (typeof startingPrefixValidation === 'string') {
        return startingPrefixValidation;
    }

    if (promptOption?.additionalValidation?.shouldValidatePackageType) {
        return await validatePackageType(input, backendTarget, adpProjectType);
    }

    return true;
}

/**
 * Validates that the provided ABAP package name has a correct starting prefix,
 * and that the UI5 ABAP repository name aligns with this prefix.
 *
 * This validation only runs if certain conditions are met based on the provided answers and prompt options.
 *
 * @param {string} input - The ABAP package name to validate.
 * @param {AbapDeployConfigAnswersInternal} answers - User-provided answers including the UI5 ABAP repository name.
 * @param {PackagePromptOptions} [promptOption] - Optional prompt configuration for package validation.
 * @param {UI5AbapRepoPromptOptions} [ui5AbapPromptOptions] - Optional UI5-specific ABAP prompt configuration.
 * @returns {string | boolean} - Returns `true` if the package is valid, otherwise returns an error message.
 */
function validatePackageStartingPrefix(
    input: string,
    answers: AbapDeployConfigAnswersInternal,
    promptOption?: PackagePromptOptions,
    ui5AbapPromptOptions?: UI5AbapRepoPromptOptions
): string | boolean {
    if (shouldValidatePackageForStartingPrefix(answers, promptOption, ui5AbapPromptOptions)) {
        const startingPrefix = getPackageStartingPrefix(input);

        //validate package starting prefix
        if (!input.startsWith('/') && !allowedPackagePrefixes.find((prefix) => prefix === startingPrefix)) {
            return t('errors.validators.abapPackageStartingPrefix');
        }

        //appName starting prefix
        if (!answers.ui5AbapRepo?.startsWith(startingPrefix)) {
            return t('errors.validators.abapInvalidAppNameNamespaceOrStartingPrefix');
        }
    }

    return true;
}

/**
 * Validates the ABAP package name format and ensures it doesn't contain forbidden characters.
 * This includes checking for special characters and adherence to ABAP package naming conventions.
 *
 * Validation only occurs if enabled via the prompt option.
 *
 * @param {string} input - The ABAP package name to validate.
 * @param {PackagePromptOptions} [promptOption] - Optional prompt settings that enable format and character validation.
 * @returns {string | boolean} - Returns `true` if valid, otherwise returns an error message.
 */
function validatePackageFormatAndSpecialCharacters(
    input: string,
    promptOption?: PackagePromptOptions
): string | boolean {
    if (promptOption?.additionalValidation?.shouldValidateFormatAndSpecialCharacters) {
        //validate for special characters
        if (!/^[A-Za-z0-9$_/]*$/.test(input)) {
            return t('errors.validators.charactersForbiddenInPackage');
        }
        //validate package format
        if (!/^(?:\/\w+\/)?[$]?\w*$/.test(input)) {
            return t('errors.validators.abapPackageInvalidFormat');
        }
    }

    return true;
}

/**
 * Determines whether the package should be validated for a starting prefix.
 * based on the provided configuration answers and prompt options.
 *
 * @param {AbapDeployConfigAnswersInternal} answers - The user's deployment configuration answers.
 * @param {PackagePromptOptions} [promptOption] - Optional package prompt options.
 * @param {UI5AbapRepoPromptOptions} [ui5AbapPromptOptions] - Optional UI5 ABAP repository prompt options.
 * @returns {boolean} - Returns `true` if the package should be validated for a starting prefix, otherwise `false`.
 */
function shouldValidatePackageForStartingPrefix(
    answers: AbapDeployConfigAnswersInternal,
    promptOption?: PackagePromptOptions,
    ui5AbapPromptOptions?: UI5AbapRepoPromptOptions
): boolean {
    const shouldValidatePackageForStartingPrefix = !!(
        answers.ui5AbapRepo &&
        promptOption?.additionalValidation?.shouldValidatePackageForStartingPrefix &&
        !ui5AbapPromptOptions?.hide &&
        !(ui5AbapPromptOptions?.hideIfOnPremise && PromptState.abapDeployConfig?.scp === false)
    );
    return shouldValidatePackageForStartingPrefix;
}

/**
 * Validates whether the provided type of an adaptation project can be deployed on the
 * system with destination: {@link PromptState.abapDeployConfig.destination}.
 *
 * @param {AdaptationProjectType | undefined} adpProjectType - The adaptation project type.
 * @param {BackendTarget | undefined} backendTarget - The system on which the Adaptation project is created.
 * @returns {Promise<boolean | string>} Promise resolved with true in case the validation succeed otherwise with a string
 * containing an error message or undefined if the project type is not provided. If the deployment destination
 * requires authentication the function resolves with true.
 */
async function validateSystemSupportAdpProjectType(
    adpProjectType?: AdaptationProjectType,
    backendTarget?: BackendTarget
): Promise<boolean | string | undefined> {
    try {
        if (!adpProjectType) {
            return undefined;
        }

        const { adaptationProjectTypes } = await getSystemInfo(undefined, backendTarget);
        if (!adaptationProjectTypes.length) {
            return t('errors.validators.invalidAdpProjectTypes');
        }
        const supportedAdpProjectTypes = adaptationProjectTypes.join(',');
        return adaptationProjectTypes.includes(adpProjectType)
            ? true
            : t('errors.validators.unsupportedAdpProjectType', {
                  adpProjectType,
                  supportedAdpProjectTypes
              });
    } catch (error) {
        if (!isAxiosError(error)) {
            return error.message;
        }

        const status = error.response?.status;

        // We omit the validation in case the user is not authenticated.
        if (status === 401 || status === 403) {
            return true;
        }

        // In case the system info api is not found we assume we are in an onPremise system.
        if (status === 404) {
            return adpProjectType === AdaptationProjectType.ON_PREMISE
                ? true
                : t('errors.validators.unsupportedAdpProjectType', {
                      adpProjectType,
                      supportedAdpProjectTypes: AdaptationProjectType.ON_PREMISE
                  });
        }

        return error.message;
    }
}

/**
 * Fetches system information for a specified package from an ABAP system. This method
 * calls the system info api call for the system related to the destination prompt.
 *
 * @param {string | undefined} packageName - The name of the package for which to retrieve system information.
 * @param {BackendTarget} [backendTarget] - Optional backend target information.
 * @returns {Promise<SystemInfo>} A promise resolved with the system information.
 */
async function getSystemInfo(packageName?: string, backendTarget?: BackendTarget): Promise<SystemInfo> {
    // TODO avasilev: The provider instance here actualy does not point always the
    // backendTarget but the system with destination: PromptState.abapDeployConfig.destination
    // which is actualy the system selected from the destination prompt which is ok for the consumers of this method.
    // From a developer experience point of view the AbapServiceProviderManager.buildAbapTarget()
    // which is a private static method of the class uses the PromptState.abapDeployConfig.destination
    // in order to construct the provider instance returned by the AbapServiceProviderManager.getOrCreateServiceProvider(),
    // the destination variable is not part of the class definition and is mutated outside of the class body in various places.
    // This breaks the class encapsulation and is hard to understand and brings a confusion also could lead
    // to unexpected behaviour.
    const provider = await AbapServiceProviderManager.getOrCreateServiceProvider(backendTarget);
    const lrep = provider.getLayeredRepository();
    return lrep.getSystemInfo(undefined, packageName);
}
