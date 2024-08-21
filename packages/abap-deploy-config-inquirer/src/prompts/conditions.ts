import { isAppStudio } from '@sap-ux/btp-utils';
import { PromptState } from './prompt-state';
import { clientDoesNotExistOrInvalid } from '../validator-utils';
import { findBackendSystemByUrl, initTransportConfig } from '../utils';
import { handleTransportConfigError } from '../error-handler';
import { t } from '../i18n';
import { getHelpUrl, HELP_TREE } from '@sap-ux/fiori-generator-shared';
import { isFeatureEnabled } from '@sap-ux/feature-toggle';
import LoggerHelper from '../logger-helper';
import {
    ClientChoiceValue,
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type BackendTarget,
    type TransportListItem
} from '../types';

/**
 * Determines if URL question should be shown.
 *
 * @param targetSystem - chosen target system
 * @returns true if target system type is URL
 */
export function showUrlQuestion(targetSystem?: string): boolean {
    return targetSystem === TargetSystemType.Url;
}

/**
 * Determines if the SCP question should be shown.
 *
 * @param previousAnswers - previous answers
 * @returns boolean
 */
export function showScpQuestion(previousAnswers: AbapDeployConfigAnswersInternal): boolean {
    if (
        (!isAppStudio() && !previousAnswers.targetSystem) ||
        (showUrlQuestion(previousAnswers.targetSystem) && previousAnswers.url?.length === 0)
    ) {
        return false;
    }

    let isSystemUnknown = false;

    if (previousAnswers.url && previousAnswers.url.length > 0) {
        const backendSystem = findBackendSystemByUrl(previousAnswers.targetSystem ?? previousAnswers.url);
        if (!backendSystem) {
            isSystemUnknown = true;
        }
    }
    return isSystemUnknown;
}

/**
 * Client condition to determine if the client question should be shown.
 *
 * @param isS4HanaCloudSystem - is S/4 HANA Cloud system
 * @returns boolean
 */
function showClientCondition(isS4HanaCloudSystem?: boolean): boolean {
    return Boolean(
        !isAppStudio() &&
            clientDoesNotExistOrInvalid(PromptState.abapDeployConfig.client) &&
            !PromptState.abapDeployConfig.scp &&
            !isS4HanaCloudSystem
    );
}

/**
 * Determines if the client choice question should be shown.
 *
 * @param client - client
 * @param isS4HanaCloudSystem - is S/4 HANA Cloud system
 * @returns boolean
 */
export function showClientChoiceQuestion(client?: string, isS4HanaCloudSystem?: boolean): boolean {
    if (PromptState.isYUI || !client) {
        return false;
    }

    return showClientCondition(isS4HanaCloudSystem);
}

/**
 * Determines if the client question should be shown.
 * Note: In some instances, when a yaml conf is parsed, double quoted properties i.e. client: "100" are saved as a number instead of a string.
 *
 * @param clientChoice - client choice from previous answers
 * @param client - client
 * @param isS4HanaCloudSystem - is S/4 HANA Cloud system
 * @returns boolean
 */
export function showClientQuestion(clientChoice?: string, client?: string, isS4HanaCloudSystem?: boolean): boolean {
    const clientCondition = showClientCondition(isS4HanaCloudSystem);

    if (clientCondition && client) {
        PromptState.abapDeployConfig.client = String(client);
    }
    const showOnCli = clientChoice === ClientChoiceValue.New || !client;
    return !PromptState.isYUI ? showOnCli && clientCondition : clientCondition;
}

/**
 * Determines if the username question should be shown.
 *
 * @param backendTarget - backend target from prompt options
 * @returns boolean
 */
export async function showUsernameQuestion(backendTarget?: BackendTarget): Promise<boolean> {
    let warning: unknown;
    ({
        transportConfig: PromptState.transportAnswers.transportConfig,
        transportConfigNeedsCreds: PromptState.transportAnswers.transportConfigNeedsCreds,
        warning
    } = await initTransportConfig({
        backendTarget: backendTarget,
        scp: PromptState.abapDeployConfig.scp,
        url: PromptState.abapDeployConfig.url,
        client: PromptState.abapDeployConfig.client,
        destination: PromptState.abapDeployConfig.destination,
        errorHandler: (e: string) => {
            handleTransportConfigError(e);
        }
    }));

    if (warning) {
        const helpLink = getHelpUrl(HELP_TREE.FIORI_TOOLS, [57266]);
        const warningMessage = t('warnings.transportConfigFailure', { helpLink });
        LoggerHelper.logger.info(`\n${warningMessage}`);
        LoggerHelper.logger.info(`\n${warning}`);
        PromptState.transportAnswers.transportConfigNeedsCreds = false;
        return false; // Log a warning and proceed
    } else {
        // Need to give the CLI some context why the username is shown.
        if (PromptState.transportAnswers.transportConfigNeedsCreds) {
            LoggerHelper.logger.info(t('errors.atoUnauthorisedSystem'));
        }
        return PromptState.transportAnswers.transportConfigNeedsCreds ?? false;
    }
}
/**
 * Determines if the password question should be shown.
 *
 * @returns boolean
 */
export function showPasswordQuestion(): boolean {
    return Boolean(PromptState.transportAnswers.transportConfigNeedsCreds);
}

/**
 * Determines if the UI5 app deploy config question should be shown (UI5 Abap Repo name & Description).
 *
 * @param hideUi5AbapRepoPrompt - option to hide the prompt if using a btp system
 * @returns boolean
 */
export function showUi5AppDeployConfigQuestion(hideUi5AbapRepoPrompt?: boolean): boolean {
    if (hideUi5AbapRepoPrompt) {
        return false;
    }
    return !PromptState.transportAnswers.transportConfigNeedsCreds;
}

/**
 * Determines if the package question should be shown.
 *
 * @returns boolean
 */
function defaultOrShowPackageQuestion(): boolean {
    if (PromptState.transportAnswers?.transportConfig?.getPackage()) {
        PromptState.abapDeployConfig.package = PromptState.transportAnswers.transportConfig.getPackage();
        return false;
    } else {
        return (
            !PromptState.transportAnswers?.transportConfigError &&
            !PromptState.transportAnswers?.transportConfigNeedsCreds
        );
    }
}

/**
 * Determines if the choice of package input options should include both manual input and search (autocomplete) input options.
 *
 * @param useAutocomplete - useAutocomplete option from prompt options
 * @returns boolean
 */
export function showPackageInputChoiceQuestion(useAutocomplete = false): boolean {
    // Only show the input choice (manual/search) when the autocomplete option is true, the prompt is supported; CLI or YUI specific version
    return Boolean(
        (!PromptState.isYUI || isFeatureEnabled('enableAutocompleteUIPrompt')) &&
            defaultOrShowPackageQuestion() &&
            useAutocomplete
    );
}

/**
 * Determines if the manual package input prompt should be shown.
 *
 * @param isCli - is in CLI
 * @param packageInputChoice - package input choice from previous answers
 * @param useAutocomplete - useAutocomplete option from prompt options
 * @returns boolean
 */
export function defaultOrShowManualPackageQuestion(
    isCli: boolean,
    packageInputChoice?: string,
    useAutocomplete = false
): boolean {
    // Until the version of YUI installed supports auto-complete we must continue to show a manual input for packages
    return (
        (!useAutocomplete ||
            (!isCli && !isFeatureEnabled('enableAutocompleteUIPrompt')) ||
            packageInputChoice === PackageInputChoices.EnterManualChoice) &&
        defaultOrShowPackageQuestion()
    );
}

/**
 * Determines if the search (autcomplete) package input prompt can be shown based on backend availability.
 *
 * @param isCli - is in CLI
 * @param packageInputChoice - package input choice from previous answers
 * @returns boolean
 */
export function defaultOrShowSearchPackageQuestion(isCli: boolean, packageInputChoice?: string): boolean {
    // Only show the autocomplete prompt when the autocomplete prompt is supported; CLI or YUI specific version
    return (
        (isCli || isFeatureEnabled('enableAutocompleteUIPrompt')) &&
        packageInputChoice === PackageInputChoices.ListExistingChoice &&
        defaultOrShowPackageQuestion()
    );
}

/**
 * Determines if the transport question should be shown.
 *
 * @returns boolean
 */
function defaultOrShowTransportQuestion(): boolean {
    if (PromptState.transportAnswers.transportConfig?.getDefaultTransport() !== undefined) {
        PromptState.abapDeployConfig.transport = PromptState.transportAnswers.transportConfig.getDefaultTransport();
        return false;
    } else {
        return (
            !PromptState.transportAnswers.transportConfigError &&
            !PromptState.transportAnswers.transportConfigNeedsCreds
        );
    }
}

/**
 * Determines if the transport input choice question should be shown.
 *
 * @returns boolean
 */
export function showTransportInputChoice(): boolean {
    return defaultOrShowTransportQuestion();
}

/**
 * Checks if the transport list is empty.
 *
 * @param transportList - list of transports
 * @returns boolean - true if the transport list is empty
 */
function isTransportListEmpty(transportList?: TransportListItem[]): boolean {
    return !transportList || transportList.length === 0;
}

/**
 * Determines if the transport list question should be shown.
 *
 * @param transportInputChoice - transportInputChoice from previous answers
 * @returns boolean
 */
export function defaultOrShowTransportListQuestion(transportInputChoice?: string): boolean {
    const showQuestion = defaultOrShowTransportQuestion();
    if (!showQuestion) {
        return false;
    }

    return (
        transportInputChoice === TransportChoices.ListExistingChoice &&
        !isTransportListEmpty(PromptState.transportAnswers.transportList)
    );
}

/**
 * Determines if the transport created prompt should be shown.
 *
 * @param transportInputChoice - transportInputChoice from previous answers
 * @returns boolean
 */
export function defaultOrShowTransportCreatedQuestion(transportInputChoice?: string): boolean {
    const showQuestion = defaultOrShowTransportQuestion();
    if (!showQuestion) {
        return false;
    }

    return (
        transportInputChoice === TransportChoices.CreateNewChoice && !!PromptState.transportAnswers.newTransportNumber
    );
}

/**
 * Determines if the manual transport prompt should be shown.
 *
 * @param transportInputChoice - transportInputChoice from previous answers
 * @returns boolean
 */
export function defaultOrShowManualTransportQuestion(transportInputChoice?: string): boolean {
    return defaultOrShowTransportQuestion() && transportInputChoice === TransportChoices.EnterManualChoice;
}

/**
 * Determines if the index prompt should be shown.
 *
 * @param options - abap deploy config prompt options
 * @returns boolean
 */
export function showIndexQuestion(options: AbapDeployConfigPromptOptions): boolean {
    const condition = Boolean(options.indexGenerationAllowed && !PromptState.abapDeployConfig.index);
    return condition && !PromptState.transportAnswers.transportConfigError && options.backendTarget?.type !== 'library';
}

/**
 * Determines if the overwrite prompt should be shown.
 *
 * @param options - abap deploy config prompt options
 * @returns boolean
 */
export function showOverwriteQuestion(options: AbapDeployConfigPromptOptions): boolean {
    return Boolean(
        options.showOverwriteQuestion && !!options.existingDeployTaskConfig && !PromptState.abapDeployConfig.overwrite
    );
}
