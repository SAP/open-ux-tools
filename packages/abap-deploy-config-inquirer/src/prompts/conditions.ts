import { isAppStudio } from '@sap-ux/btp-utils';
import { PromptState } from './prompt-state';
import { findBackendSystemByUrl, initTransportConfig } from '../utils';
import { handleTransportConfigError } from '../error-handler';
import { t } from '../i18n';
import { getHelpUrl, HELP_TREE } from '@sap-ux/guided-answers-helper';
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
 * @param scp - is SCP system
 * @param isS4HanaCloudSystem - is S/4 HANA Cloud system
 * @returns boolean
 */
function showClientCondition(scp?: boolean, isS4HanaCloudSystem?: boolean): boolean {
    return Boolean(!isAppStudio() && !scp && !isS4HanaCloudSystem);
}

/**
 * Determines if the client choice question should be shown.
 *
 * @param scp - SCP
 * @param client - client
 * @returns boolean
 */
export function showClientChoiceQuestion(scp?: boolean, client?: string): boolean {
    if (PromptState.isYUI || !client) {
        return false;
    }
    return showClientCondition(scp, PromptState.abapDeployConfig?.isS4HC);
}

/**
 * Determines if the client question should be shown under very specific conditions.
 *
 * @param previousAnswers - previous answers
 * @returns boolean
 */
export function showClientQuestion(previousAnswers?: AbapDeployConfigAnswersInternal): boolean {
    const clientCondition = showClientCondition(previousAnswers?.scp, PromptState.abapDeployConfig?.isS4HC);
    const isTargetUrl = previousAnswers?.targetSystem === TargetSystemType.Url;
    const showCli = !PromptState.isYUI
        ? previousAnswers?.clientChoice === ClientChoiceValue.New || isTargetUrl
        : isTargetUrl;
    const showYui = PromptState.isYUI ? isTargetUrl : false;
    return (showYui && clientCondition) || (showCli && clientCondition);
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
    if (!useAutocomplete) {
        return false;
    }
    const isPromptSupported = !PromptState.isYUI || (PromptState.isYUI && useAutocomplete);
    return isPromptSupported && defaultOrShowPackageQuestion();
}

/**
 * Determines if the manual package input prompt should be shown.
 *
 * @param packageInputChoice - package input choice from previous answers
 * @param useAutocomplete - useAutocomplete option from prompt options
 * @returns boolean
 */
export function defaultOrShowManualPackageQuestion(packageInputChoice?: string, useAutocomplete = false): boolean {
    if (!useAutocomplete) {
        return false;
    }
    return packageInputChoice === PackageInputChoices.EnterManualChoice && defaultOrShowPackageQuestion();
}

/**
 * Determines if the search (autocomplete) package input prompt can be shown based on backend availability.
 *
 * @param packageInputChoice - package input choice from previous answers
 * @param useAutocomplete - useAutocomplete option from prompt options
 * @returns boolean
 */
export function defaultOrShowSearchPackageQuestion(packageInputChoice?: string, useAutocomplete = false): boolean {
    // Only show the autocomplete prompt when the autocomplete prompt is supported; CLI or YUI specific version
    if (!useAutocomplete) {
        return false;
    }
    return packageInputChoice === PackageInputChoices.ListExistingChoice && defaultOrShowPackageQuestion();
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
