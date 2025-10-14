import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
import { AdaptationProjectType } from '@sap-ux/axios-extension';
import { isAbapEnvironmentOnBtp, isAppStudio, isS4HC, type Destinations } from '@sap-ux/btp-utils';
import { ErrorHandler } from '@sap-ux/inquirer-common';
import { AuthenticationType } from '@sap-ux/store';
import { DEFAULT_PACKAGE_ABAP } from '../constants';
import { handleTransportConfigError } from '../error-handler';
import { t } from '../i18n';
import LoggerHelper from '../logger-helper';
import { getSystemInfo, getTransportListFromService, isAbapCloud } from '../service-provider-utils';
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
    type TargetSystemPromptOptions,
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
 * Validates the system type based on the provided options and backend target.
 *
 * @param options - target system options
 * @returns boolean
 */
async function validateSystemType(options?: TargetSystemPromptOptions): Promise<boolean | string> {
    if (options?.additionalValidation?.shouldRestrictDifferentSystemType) {
        const isDefaultProviderAbapCloud = AbapServiceProviderManager.getIsDefaultProviderAbapCloud();
        const isSelectedS4HC = PromptState?.abapDeployConfig?.isAbapCloud;
        if (isDefaultProviderAbapCloud === true && isSelectedS4HC === false) {
            return t('errors.validators.invalidCloudSystem');
        } else if (isDefaultProviderAbapCloud === false && isSelectedS4HC) {
            return t('errors.validators.invalidOnPremSystem');
        }
    }

    return true;
}
/**
 * Validates the destination question and sets the destination in the prompt state.
 *
 * @param destination - chosen destination
 * @param destinations - list of destinations
 * @param options - target system options
 * @param backendTarget - backend target
 * @returns boolean
 */
export async function validateDestinationQuestion(
    destination: string,
    destinations?: Destinations,
    options?: TargetSystemPromptOptions,
    backendTarget?: BackendTarget
): Promise<boolean | string> {
    PromptState.resetAbapDeployConfig();
    await updateDestinationPromptState(destination, destinations, options, backendTarget);
    const systemTypeValidation = await validateSystemType(options);
    if (typeof systemTypeValidation === 'string') {
        return systemTypeValidation;
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
 * @param destination - destination
 * @param destinations - list of destinations
 * @param options - target system options
 * @param backendTarget - backend target
 */
export async function updateDestinationPromptState(
    destination: string,
    destinations: Destinations = {},
    options?: TargetSystemPromptOptions,
    backendTarget?: BackendTarget
): Promise<void> {
    const dest = destinations[destination];
    if (dest) {
        PromptState.abapDeployConfig.destination = dest.Name;
        updatePromptState({
            url: dest?.Host,
            client: dest['sap-client'],
            isAbapCloud: isS4HC(dest),
            scp: isAbapEnvironmentOnBtp(dest)
        });

        if (options?.additionalValidation?.shouldRestrictDifferentSystemType) {
            PromptState.abapDeployConfig.isAbapCloud = (await isAbapCloud(backendTarget)) ?? false;
        }
    }
}

/**
 * Validates the target system.
 *
 * @param target - target system
 * @param choices - abab system choices
 * @param options - target system options
 * @returns boolean or error message string
 */
export async function validateTargetSystem(
    target?: string,
    choices?: AbapSystemChoice[],
    options?: TargetSystemPromptOptions
): Promise<boolean | string> {
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
                scp: choice.scp,
                isAbapCloud: choice.isAbapCloud,
                target: target
            });
        }

        const systemTypeValidation = await validateSystemType(options);
        if (typeof systemTypeValidation === 'string') {
            return systemTypeValidation;
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
 * @param shouldCheckSystemType - if the system type should be checked
 * @returns boolean or error message as a string
 */
export async function validateCredentials(
    input: string,
    previousAnswers: AbapDeployConfigAnswersInternal,
    backendTarget?: BackendTarget,
    shouldCheckSystemType = false
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

    if (isAppStudio() && shouldCheckSystemType) {
        PromptState.abapDeployConfig.isAbapCloud = (await isAbapCloud(backendTarget)) ?? false;
    }

    PromptState.transportAnswers.transportConfigNeedsCreds = transportConfigNeedsCreds ?? false;
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
 * @returns {Promise<boolean>} - Resolves to `true` if the package is cloud-ready, `false` otherwise.
 */
async function validatePackageType(input: string, backendTarget?: BackendTarget): Promise<boolean | string> {
    const isAbapCloud = PromptState?.abapDeployConfig?.isAbapCloud;
    if (!isAbapCloud) {
        LoggerHelper.logger.debug(`System is OnPremise, skipping package "${input}" type validation`);
        return true;
    }
    const systemInfoResult = await getSystemInfo(input, backendTarget);
    if (!systemInfoResult.apiExist) {
        return true;
    }

    const types = systemInfoResult.systemInfo?.adaptationProjectTypes;
    if (types && types?.length > 1) {
        return true;
    }

    const isValidPackageType = types?.length === 1 && types[0] === AdaptationProjectType.CLOUD_READY;

    return isValidPackageType ? true : t('errors.validators.invalidCloudPackage');
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
    useStandalone?: boolean
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
        return await validatePackageType(input, backendTarget);
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
        !(
            ui5AbapPromptOptions?.hideIfOnPremise === true &&
            PromptState.abapDeployConfig?.isAbapCloud === false &&
            PromptState.abapDeployConfig?.scp === false
        )
    );
    return shouldValidatePackageForStartingPrefix;
}
