import { isAppStudio } from '@sap-ux/btp-utils';
import { PromptState } from './prompt-state';
import { findBackendSystemByUrl, initTransportConfig } from '../utils';
import { handleTransportConfigError } from '../error-handler';
import { t } from '../i18n';
import LoggerHelper from '../logger-helper';
import {
    ClientChoiceValue,
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type UI5AbapRepoPromptOptions,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type BackendTarget,
    type TransportListItem,
    type TransportInputChoicePromptOptions
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
 * Client condition to determine if the client question should be shown. Validates the SCP confirmation and project configuration properties.
 *
 * @param scp - is SCP system
 * @returns boolean
 */
function showClientCondition(scp?: boolean): boolean {
    return Boolean(
        !isAppStudio() && !PromptState.abapDeployConfig?.isS4HC && !scp && !PromptState.abapDeployConfig?.scp
    );
}

/**
 * Determines if the client choice question should be shown.
 *
 * @param previousAnswers - previous answers
 * @param client - client
 * @returns boolean
 */
export function showClientChoiceQuestion(previousAnswers?: AbapDeployConfigAnswersInternal, client?: string): boolean {
    if (PromptState.isYUI || !client) {
        return false;
    }
    return showClientCondition(previousAnswers?.scp) && previousAnswers?.targetSystem === TargetSystemType.Url;
}

/**
 * Determines if the client question should be shown under very specific conditions.
 *
 * @param previousAnswers - previous answers
 * @returns boolean
 */
export function showClientQuestion(previousAnswers?: AbapDeployConfigAnswersInternal): boolean {
    const clientCondition = showClientCondition(previousAnswers?.scp);
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
    const { transportConfig, transportConfigNeedsCreds } = await initTransportConfig({
        backendTarget: backendTarget,
        url: PromptState.abapDeployConfig.url,
        client: PromptState.abapDeployConfig.client,
        destination: PromptState.abapDeployConfig.destination,
        errorHandler: (e: string) => {
            handleTransportConfigError(e);
        }
    });

    // Update the prompt state with the transport configuration
    PromptState.transportAnswers.transportConfig = transportConfig;
    PromptState.transportAnswers.transportConfigNeedsCreds = transportConfigNeedsCreds ?? false;

    // Provide context to the CLI when username credentials are required
    if (transportConfigNeedsCreds) {
        LoggerHelper.logger.info(t('errors.atoUnauthorisedSystem'));
    }
    return PromptState.transportAnswers.transportConfigNeedsCreds;
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
 * @param ui5AbapPromptOptions - UI5 Abap Repo prompt options
 * @returns boolean
 */
export function showUi5AppDeployConfigQuestion(ui5AbapPromptOptions?: UI5AbapRepoPromptOptions): boolean {
    if (
        !ui5AbapPromptOptions?.hide &&
        ui5AbapPromptOptions?.hideIfOnPremise &&
        !PromptState.abapDeployConfig?.scp &&
        !PromptState.abapDeployConfig?.isS4HC
    ) {
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
    if (PromptState.transportAnswers.transportRequired === false) {
        return false;
    }
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
 * @param options - abap deploy config prompt options
 * @param answers - current answers object
 * @returns {boolean} True if the transport input choice prompt should be shown, false otherwise.
 */
// Previous answers and visibility state for transport input choice prompt
let prevTransportInputChoiceAnswers: AbapDeployConfigAnswersInternal | undefined;
let prevTransportInputChoiceVisible: boolean | undefined;
// Debounce timer and debounced value for ui5AbapRepo field
let ui5AbapRepoDebounceTimer: NodeJS.Timeout | undefined;
let ui5AbapRepoDebouncedValue: string | undefined;
// Debounce delay in milliseconds for ui5AbapRepo typing
const UI5_ABAP_REPO_DEBOUNCE_MS = 300;
/**
 * Checks if the UI5 ABAP Repo field is being debounced (i.e., user is still typing), and manages debounce timer/state.
 *
 * @param answers - Current answers object
 * @param debounceTimer - Current debounce timer
 * @param debouncedValue - Last debounced value
 * @param setDebounce - Callback to set debounce timer and value
 * @param prevVisible - Previous visibility state
 * @returns {boolean|undefined} Returns previous visibility if debouncing, otherwise undefined
 */
export function isDebouncingUi5AbapRepo(
    answers: AbapDeployConfigAnswersInternal | undefined,
    debounceTimer: NodeJS.Timeout | undefined,
    debouncedValue: string | undefined,
    setDebounce: (timer: NodeJS.Timeout, value: string) => void,
    prevVisible: boolean | undefined
): boolean | undefined {
    if (answers && typeof answers.ui5AbapRepo === 'string') {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        if (debouncedValue !== answers.ui5AbapRepo) {
            const timer = setTimeout(() => {
                setDebounce(timer, answers.ui5AbapRepo!);
            }, UI5_ABAP_REPO_DEBOUNCE_MS);
            return typeof prevVisible === 'boolean' ? prevVisible : false;
        }
    }
    return undefined;
}

/**
 * Checks if only the description field has changed between two answers objects.
 *
 * @param answers - Current answers object
 * @param prevAnswers - Previous answers object
 * @returns {boolean} True if only the description changed, false otherwise.
 */
function onlyDescriptionChanged(
    answers: AbapDeployConfigAnswersInternal,
    prevAnswers: AbapDeployConfigAnswersInternal | undefined
): boolean {
    if (!prevAnswers) {
        return false;
    }
    const keys = Object.keys(answers) as (keyof AbapDeployConfigAnswersInternal)[];
    return (
        keys.every((key) => key === 'description' || prevAnswers[key] === answers[key]) &&
        prevAnswers.description !== answers.description
    );
}

/**
 * Determines if the transport input choice question should be shown.
 *
 * @param options - abap deploy config prompt options
 * @param answers - current answers object
 * @returns {boolean} True if the transport input choice prompt should be shown, false otherwise.
 */
export function showTransportInputChoice(
    options?: TransportInputChoicePromptOptions,
    answers?: AbapDeployConfigAnswersInternal
): boolean {
    if (
        options?.hideIfOnPremise === true &&
        !PromptState.abapDeployConfig?.isS4HC &&
        !PromptState.abapDeployConfig?.scp
    ) {
        return false;
    }
    // // Debounce logic: if ui5AbapRepo is being typed, delay transport inputs visibility update until user stops typing
    // const debounceResult = isDebouncingUi5AbapRepo(
    //     answers,
    //     ui5AbapRepoDebounceTimer,
    //     ui5AbapRepoDebouncedValue,
    //     (timer, value) => {
    //         ui5AbapRepoDebounceTimer = timer;
    //         ui5AbapRepoDebouncedValue = value;
    //     },
    //     prevTransportInputChoiceVisible
    // );
    // if (typeof debounceResult === 'boolean') {
    //     return debounceResult;
    // }
    // Description change logic
    if (
        answers &&
        onlyDescriptionChanged(answers, prevTransportInputChoiceAnswers) &&
        typeof prevTransportInputChoiceVisible === 'boolean'
    ) {
        return prevTransportInputChoiceVisible;
    }
    // Evaluate whether the transport input should be shown based on current state
    const shouldShow = defaultOrShowTransportQuestion();
    // Update previous answers and visibility state for next invocation
    if (answers) {
        prevTransportInputChoiceAnswers = { ...answers };
        prevTransportInputChoiceVisible = shouldShow;
    }
    return shouldShow;
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
 * @param transportInputChoiceOptions - transportInputChoice options
 * @returns boolean
 */
export function defaultOrShowTransportListQuestion(
    transportInputChoice?: string,
    transportInputChoiceOptions?: TransportInputChoicePromptOptions
): boolean {
    const showQuestion = defaultOrShowTransportQuestion();
    if (!showQuestion) {
        return false;
    }

    return (
        transportInputChoice === TransportChoices.ListExistingChoice &&
        !isTransportListEmpty(PromptState.transportAnswers.transportList) &&
        !(transportInputChoiceOptions?.hideIfOnPremise === true && PromptState?.abapDeployConfig?.isS4HC === false)
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
 * @param transportInputChoiceOptions - transportInputChoice options
 * @returns boolean
 */
// Previous answers and visibility state for manual transport input prompt
let prevManualTransportAnswers: AbapDeployConfigAnswersInternal | undefined;
let prevManualTransportVisible: boolean | undefined;
// Debounce timer and debounced value for ui5AbapRepo field (manual transport)
let ui5AbapRepoManualDebounceTimer: NodeJS.Timeout | undefined;
let ui5AbapRepoManualDebouncedValue: string | undefined;
/**
 * Determines if the manual transport input prompt should be shown.
 *
 * @param transportInputChoice - The selected transport input choice
 * @param transportInputChoiceOptions - Options for the transport input choice prompt
 * @param answers - Current answers object
 * @returns {boolean} True if the manual transport input prompt should be shown, false otherwise.
 */
export function defaultOrShowManualTransportQuestion(
    transportInputChoice?: string,
    transportInputChoiceOptions?: TransportInputChoicePromptOptions,
    answers?: AbapDeployConfigAnswersInternal
): boolean {
    // // Debounce logic: if ui5AbapRepo is being typed, delay transport inputs visibility update until user stops typing
    // if (answers && typeof answers.ui5AbapRepo === 'string') {
    //     if (ui5AbapRepoManualDebounceTimer) {
    //         clearTimeout(ui5AbapRepoManualDebounceTimer);
    //     }
    //     if (ui5AbapRepoManualDebouncedValue !== answers.ui5AbapRepo) {
    //         ui5AbapRepoManualDebounceTimer = setTimeout(() => {
    //             ui5AbapRepoManualDebouncedValue = answers.ui5AbapRepo;
    //         }, UI5_ABAP_REPO_DEBOUNCE_MS);
    //         return typeof prevManualTransportVisible === 'boolean' ? prevManualTransportVisible : false;
    //     }
    // }
    // If we have previous answers, check if only the description field changed
    if (answers && prevManualTransportAnswers) {
        const keys = Object.keys(answers) as (keyof AbapDeployConfigAnswersInternal)[];
        const onlyDescriptionChanged =
            keys.every((key) => key === 'description' || prevManualTransportAnswers![key] === answers[key]) &&
            prevManualTransportAnswers!.description !== answers.description;
        if (onlyDescriptionChanged && typeof prevManualTransportVisible === 'boolean') {
            return prevManualTransportVisible;
        }
    }
    // Evaluate whether the manual transport input should be shown based on current state
    const shouldShow =
        defaultOrShowTransportQuestion() &&
        (transportInputChoice === TransportChoices.EnterManualChoice ||
            (transportInputChoiceOptions?.hideIfOnPremise === true && PromptState?.abapDeployConfig?.isS4HC === false));
    // Update previous answers and visibility state for next invocation
    if (answers) {
        prevManualTransportAnswers = { ...answers };
        prevManualTransportVisible = shouldShow;
    }
    return shouldShow;
}

/**
 * Determines if the index prompt should be shown.
 *
 * @param options - abap deploy config prompt options
 * @returns boolean
 */
export function showIndexQuestion(options: AbapDeployConfigPromptOptions): boolean {
    const condition = Boolean(options.index?.indexGenerationAllowed && !PromptState.abapDeployConfig.index);
    return condition && !PromptState.transportAnswers.transportConfigError && options.backendTarget?.type !== 'library';
}
