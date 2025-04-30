import { isAppStudio } from '@sap-ux/btp-utils';
import type { ConfigAnswers, FlexUISupportedSystem } from '@sap-ux/adp-tooling';

/**
 * Determines if a credential question should be shown.
 * In this simplified approach, we show credentials if a system is provided and the login was not successful.
 *
 * @param {ConfigAnswers} answers - User provided configuration details.
 * @param {boolean} isAuthRequired - A flag indicating whether system authentication is needed.
 * @returns {boolean} True if credentials should be requested.
 */
export function showCredentialQuestion(answers: ConfigAnswers, isAuthRequired: boolean): boolean {
    return !!answers.system && isAuthRequired;
}

/**
 * Determines if an application question should be shown.
 *
 * @param {ConfigAnswers} answers - The user-provided answers containing application details.
 * @param {boolean} appsLoaded - A flag indicating whether there are loaded apps.
 * @param {boolean} isAuthRequired - A flag indicating whether system authentication is needed.
 * @param {boolean} isLoginSuccessful - A flag indicating that system login was successful.
 * @returns {boolean} True if the application question should be shown.
 */
export function showApplicationQuestion(
    answers: ConfigAnswers,
    appsLoaded: boolean,
    isAuthRequired: boolean,
    isLoginSuccessful: boolean
): boolean {
    return !!answers.system && appsLoaded && (isAuthRequired ? isLoginSuccessful : true);
}

/**
 * Determines if an application error question will be shown based on the answers and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {FlexUISupportedSystem} flexUISystem - The system type info (e.g., onPremise/UIFlex).
 * @param {boolean} isApplicationSupported - Whether the selected application is supported.
 * @returns {boolean | undefined} True if an application error will be shown, otherwise false or undefined based on the conditions evaluated.
 */
export function showApplicationError(
    answers: ConfigAnswers,
    flexUISystem: FlexUISupportedSystem | undefined,
    isApplicationSupported: boolean
): boolean {
    return (
        answers.application &&
        isAppStudio() &&
        !isApplicationSupported &&
        !!flexUISystem?.isOnPremise &&
        flexUISystem?.isUIFlex
    );
}

/**
 * Determines if an extension project is allowed based on the system and application conditions.
 *
 * @param {ConfigAnswers} answers - The user-provided answers containing application details.
 * @param {FlexUISupportedSystem} flexUISystem - The system type info (e.g., onPremise/UIFlex).
 * @param {boolean} isCloudProject - Whether the system is a cloud-based system.
 * @param {boolean} isApplicationSupported - Whether the selected application is supported.
 * @param {boolean} hasSyncViews - Whether synchronized views exist for the app.
 * @returns {boolean | undefined} True if an extension project is allowed, otherwise false or undefined.
 */
export function showExtensionProjectQuestion(
    answers: ConfigAnswers,
    flexUISystem: FlexUISupportedSystem | undefined,
    isCloudProject: boolean | undefined,
    isApplicationSupported: boolean,
    hasSyncViews: boolean
): boolean {
    if (!answers.application) {
        return false;
    }

    if (isCloudProject) {
        return false;
    }

    const isOnPremiseAppStudio = !!flexUISystem?.isOnPremise && isAppStudio();
    const nonFlexOrNonOnPremise = flexUISystem && (!flexUISystem?.isOnPremise || !flexUISystem?.isUIFlex);

    return (
        isOnPremiseAppStudio &&
        (!isApplicationSupported || (isApplicationSupported && (nonFlexOrNonOnPremise || hasSyncViews)))
    );
}

/**
 * Determines if an internal question for ACH and FioriId will be shown based on the answers and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {boolean} isCustomerBase - Indicates whether the adaptation layer is CUSTOMER_BASE.
 * @param {boolean} isApplicationSupported - Whether the selected application is supported.
 * @returns {boolean | undefined} True if an internal question for ACH and FioriId question will be shown, otherwise false.
 */
export function showInternalQuestions(
    answers: ConfigAnswers,
    isCustomerBase: boolean,
    isApplicationSupported: boolean
): boolean {
    return !!answers.system && answers.application && !isCustomerBase && isApplicationSupported;
}
