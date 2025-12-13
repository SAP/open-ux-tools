import { isAppStudio } from '@sap-ux/btp-utils';
import { AppRouterType } from '@sap-ux/adp-tooling';
import type { ConfigAnswers, FlexUICapability, CfServicesAnswers, CFApp } from '@sap-ux/adp-tooling';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

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
 * @param params - Function parameters as an object literal.
 * @param {boolean} params.isApplicationSelected - True if the user has selected an application.
 * @param {boolean} params.isApplicationSupported - Whether the selected application is supported.
 * @param {boolean} params.hasSyncViews - Whether synchronized views exist for the app.
 * @param {AdaptationProjectType|undefined} params.projectType - The project type.
 * @param {FlexUICapability | undefined} params.flexUICapability - The system type info (e.g., onPremise/UIFlex).
 * @returns {boolean} True if an extension project is allowed, otherwise false or undefined.
 */
export function showExtensionProjectQuestion({
    isApplicationSelected,
    isApplicationSupported,
    hasSyncViews,
    projectType,
    flexUICapability
}: {
    isApplicationSelected: boolean;
    isApplicationSupported: boolean;
    hasSyncViews: boolean;
    projectType?: AdaptationProjectType;
    flexUICapability?: FlexUICapability;
}): boolean {
    if (!isApplicationSelected || projectType === AdaptationProjectType.CLOUD_READY) {
        return false;
    }

    const isDtaDeploymentSupportedAppStudio = !!flexUICapability?.isDtaFolderDeploymentSupported && isAppStudio();
    const nonFlexOrNonOnPremise =
        flexUICapability && (!flexUICapability?.isDtaFolderDeploymentSupported || !flexUICapability?.isUIFlexSupported);

    return (
        isDtaDeploymentSupportedAppStudio &&
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
