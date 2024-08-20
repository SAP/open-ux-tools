import { isAppStudio } from '@sap-ux/btp-utils';

import type ConfigInfoPrompter from '../config';
import type { ConfigurationInfoAnswers } from '../../../../types';

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
