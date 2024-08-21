import { isAppStudio } from '@sap-ux/btp-utils';

import type ConfigInfoPrompter from '../config';
import { InputChoice, type ConfigurationInfoAnswers, type DeployConfigAnswers } from '../../../../types';

/**
 * Determines if an internal question for ACH and FioriId will be shown based on the answers and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {ConfigInfoPrompter} prompter - The instance responsible for providing configuration and system information.
 * @returns {boolean | undefined} True if an internal question for ACH and FioriId question will be shown, otherwise false.
 */
export function showInternalQuestions(answers: ConfigurationInfoAnswers, prompter: ConfigInfoPrompter): boolean {
    return (
        !!answers.system &&
        answers.application &&
        !prompter.isCustomerBase &&
        !prompter.shouldAuthenticate(answers) &&
        prompter.isApplicationSupported
    );
}

/**
 * Determines if a ui5 version question will be shown based on the answers and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {ConfigInfoPrompter} prompter - The instance responsible for providing configuration and system information.
 * @returns {boolean | undefined} True if a ui5 version question will be shown, otherwise false.
 */
export function showUI5VersionQuestion(answers: ConfigurationInfoAnswers, prompter: ConfigInfoPrompter): boolean {
    return (
        !!answers.system &&
        !prompter.shouldAuthenticate(answers) &&
        !prompter.isCloudProject &&
        !!prompter.systemInfo?.adaptationProjectTypes?.length &&
        (prompter.hasSystemAuthentication ? prompter.isLoginSuccessfull : true)
    );
}

/**
 * Determines if a project type question will be shown based on the answers and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {ConfigInfoPrompter} prompter - The instance responsible for providing configuration and system information.
 * @returns {boolean | undefined} True if a project type question will be shown, otherwise false
 */
export function showProjectTypeQuestion(answers: ConfigurationInfoAnswers, prompter: ConfigInfoPrompter): boolean {
    return (
        !!answers.system &&
        !prompter.shouldAuthenticate(answers) &&
        !!prompter.systemInfo?.adaptationProjectTypes?.length &&
        (prompter.hasSystemAuthentication ? prompter.isLoginSuccessfull : true)
    );
}

/**
 * Determines if an application question will be shown based on the answers and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {ConfigInfoPrompter} prompter - The instance responsible for providing configuration and system information.
 * @returns {boolean | undefined} True if a application question will be shown, otherwise false.
 */
export function showApplicationQuestion(answers: ConfigurationInfoAnswers, prompter: ConfigInfoPrompter): boolean {
    return (
        !!answers.system &&
        !prompter.shouldAuthenticate(answers) &&
        (prompter.hasSystemAuthentication ? prompter.isLoginSuccessfull : true) &&
        !!prompter.systemInfo?.adaptationProjectTypes?.length
    );
}

/**
 * Determines if a credential question will be shown based on the answers and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {ConfigInfoPrompter} prompter - The instance responsible for providing configuration and system information.
 * @returns {boolean | undefined} True if a credential question will be shown, otherwise false or undefined.
 */
export function showCredentialQuestion(
    answers: ConfigurationInfoAnswers,
    prompter: ConfigInfoPrompter
): boolean | undefined {
    if (answers.system) {
        return prompter.hasSystemAuthentication;
    } else {
        return false;
    }
}

/**
 * Determines if an application error question will be shown based on the answers and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {ConfigInfoPrompter} prompter - The instance responsible for providing configuration and system information.
 * @returns {boolean | undefined} True if an application error will be shown, otherwise false or undefined based on the conditions evaluated.
 */
export function showApplicationErrorQuestion(
    answers: ConfigurationInfoAnswers,
    prompter: ConfigInfoPrompter
): boolean | undefined {
    return (
        answers.application &&
        isAppStudio() &&
        !prompter.isApplicationSupported &&
        prompter?.flexUISystem?.isOnPremise &&
        prompter?.flexUISystem?.isUIFlex
    );
}

/**
 * Determines if an extension project is allowed based on the application details and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {ConfigInfoPrompter} prompter - The instance responsible for providing configuration and system information.
 * @returns {boolean | undefined} True if an extension project is allowed, otherwise false or undefined based on the conditions evaluated.
 */
export function showExtensionProjectQuestion(
    answers: ConfigurationInfoAnswers,
    prompter: ConfigInfoPrompter
): boolean | undefined {
    return answers.application && allowExtensionProject(prompter);
}

/**
 * Evaluates if an extension project setup is permissible under the current system and project conditions.
 *
 * @param {ConfigInfoPrompter} prompter - The instance managing and providing system and project configuration details.
 * @returns {boolean | undefined} True if an extension project is permissible under specific conditions.
 */
export function allowExtensionProject(prompter: ConfigInfoPrompter): boolean | undefined {
    if (prompter.isCloudProject) {
        return false;
    }

    const isOnPremiseAppStudio = prompter.flexUISystem?.isOnPremise && isAppStudio();
    const nonFlexOrNonOnPremise =
        prompter.flexUISystem && (!prompter.flexUISystem.isOnPremise || !prompter.flexUISystem.isUIFlex);

    return (
        isOnPremiseAppStudio &&
        (!prompter.isApplicationSupported ||
            (prompter.isApplicationSupported && (nonFlexOrNonOnPremise || prompter.appIdentifier.appSync)))
    );
}

/**
 * Determines if package manual question will be shown based on the answers and validation on package input choice validation.
 *
 * @param {DeployConfigAnswers} answers - The user-provided answers containing application details.
 * @param {packageInputChoiceValid} packageInputChoiceValid - The validation result of package input choice.
 * @returns {boolean} True if question will be shown, otherwise false based on the conditions evaluated.
 */
export function showPackageManualQuestion(
    answers: DeployConfigAnswers,
    packageInputChoiceValid: string | boolean
): boolean {
    return (
        answers?.packageInputChoice === InputChoice.ENTER_MANUALLY ||
        (answers.packageInputChoice === InputChoice.CHOOSE_FROM_EXISTING && typeof packageInputChoiceValid === 'string')
    );
}

/**
 * Determines if transport-related prompts should be shown based on the package choice and its name.
 * Transport prompts should not be shown if the chosen package is '$TMP'.
 *
 * @param {DeployConfigAnswers} answers - The current answers containing the package choice and names.
 * @returns {boolean} True if transport-related prompts should be shown, otherwise false.
 */
export function shouldShowTransportRelatedPrompt(answers: DeployConfigAnswers): boolean {
    return (
        (answers?.packageAutocomplete?.toUpperCase() !== '$TMP' &&
            answers?.packageInputChoice === InputChoice.CHOOSE_FROM_EXISTING) ||
        (answers?.packageManual?.toUpperCase() !== '$TMP' && answers?.packageInputChoice === InputChoice.ENTER_MANUALLY)
    );
}
