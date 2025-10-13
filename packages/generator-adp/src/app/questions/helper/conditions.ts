import { isAppStudio } from '@sap-ux/btp-utils';
import { AppRouterType } from '@sap-ux/adp-tooling';
import type { ConfigAnswers, FlexUISupportedSystem, CfServicesAnswers, CFApp } from '@sap-ux/adp-tooling';

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

/**
 * Determines if the business solution name question should be shown.
 *
 * @param {CfServicesAnswers} answers - The user-provided answers containing application details.
 * @param {boolean} isCFLoggedIn - A flag indicating whether the user is logged in to Cloud Foundry.
 * @param {boolean} showSolutionNamePrompt - A flag indicating whether the solution name prompt should be shown.
 * @param {string} businessService - The business service to be used.
 * @returns {boolean} True if the business solution name question should be shown, otherwise false.
 */
export function showBusinessSolutionNameQuestion(
    answers: CfServicesAnswers,
    isCFLoggedIn: boolean,
    showSolutionNamePrompt: boolean,
    businessService: string | undefined
): boolean {
    return isCFLoggedIn && answers.approuter === AppRouterType.MANAGED && showSolutionNamePrompt && !!businessService;
}

/**
 * Determines if the base app prompt should be shown.
 *
 * @param {CfServicesAnswers} answers - The user-provided answers containing application details.
 * @param {boolean} isCFLoggedIn - A flag indicating whether the user is logged in to Cloud Foundry.
 * @param {CFApp[]} apps - The base apps available.
 * @returns {boolean} True if the base app prompt should be shown, otherwise false.
 */
export function shouldShowBaseAppPrompt(answers: CfServicesAnswers, isCFLoggedIn: boolean, apps: CFApp[]): boolean {
    return isCFLoggedIn && !!answers.businessService && !!apps.length;
}
