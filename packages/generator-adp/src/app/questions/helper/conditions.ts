import type { ConfigAnswers } from '@sap-ux/adp-tooling';

/**
 * Determines if authentication is necessary based on the provided configuration answers.
 * It checks if the system requires authentication and if the necessary credentials are provided.
 *
 * @param {ConfigAnswers} answers - User provided configuration details.
 * @param {boolean} systemRequiresAuth - A flag indicating if system requires authentication.
 * @returns {boolean | string} True if authentication should proceed, false if there are issues with credentials.
 */
export function shouldAuthenticate<T extends ConfigAnswers>(answers: T, systemRequiresAuth: boolean): boolean {
    return !!answers.system && systemRequiresAuth && (answers.username === '' || answers.password === '');
}

/**
 * Determines if an application question will be shown based on the answers and specific conditions.
 *
 * @param {ConfigAnswers} answers - The user-provided answers containing application details.
 * @param {boolean} systemRequiresAuth - A flag indicating if system requires authentication.
 * @param {boolean} isLoginSuccessful - A flag indicating that system login was successful.
 * @returns {boolean | undefined} True if a application question will be shown, otherwise false.
 */
export function showApplicationQuestion<T extends ConfigAnswers>(
    answers: T,
    systemRequiresAuth: boolean,
    isLoginSuccessful: boolean
): boolean {
    return !!answers.system && !shouldAuthenticate(answers, systemRequiresAuth) && isLoginSuccessful;
}

/**
 * Determines if a credential question will be shown based on the answers and specific conditions.
 *
 * @param {ConfigAnswers} answers - The user-provided answers containing application details.
 * @param {boolean} systemRequiresAuth - A flag indicating if system requires authentication.
 * @returns {boolean | undefined} True if a credential question will be shown, otherwise false or undefined.
 */
export function showCredentialQuestion(answers: ConfigAnswers, systemRequiresAuth: boolean): boolean {
    if (answers.system) {
        return systemRequiresAuth;
    } else {
        return false;
    }
}
