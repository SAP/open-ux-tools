import type { ConfigAnswers } from '@sap-ux/adp-tooling';

/**
 * Determines if a credential question should be shown.
 * In this simplified approach, we show credentials if a system is provided and the login was not successful.
 *
 * @param {ConfigAnswers} answers - User provided configuration details.
 * @param {boolean} isLoginSuccessful - A flag indicating whether system login was successful.
 * @returns {boolean} True if credentials should be requested.
 */
export function showCredentialQuestion(answers: ConfigAnswers, isLoginSuccessful: boolean): boolean {
    return !!answers.system && !isLoginSuccessful;
}

/**
 * Determines if an application question should be shown.
 *
 * @param {ConfigAnswers} answers - The user-provided answers containing application details.
 * @param {boolean} isLoginSuccessful - A flag indicating that system login was successful.
 * @returns {boolean} True if the application question should be shown.
 */
export function showApplicationQuestion(answers: ConfigAnswers, isLoginSuccessful: boolean): boolean {
    return !!answers.system && isLoginSuccessful;
}
