import { type SystemLookup, isCFExternalLoginEnabled } from '@sap-ux/adp-tooling';
import { validateNamespaceAdp, validateProjectName } from '@sap-ux/project-input-validator';

import { isAppStudio } from '@sap-ux/btp-utils';
import { t } from '../../../utils/i18n';
import { isString } from '../../../utils/type-guards';
import { EXTENSIBILITY_GENERATOR_NS, resolveNodeModuleGenerator } from '../../extension-project';
import { TargetEnvironment } from '../../types';

interface JsonInputParams {
    projectName: string;
    targetFolder: string;
    namespace: string;
    system: string;
}

/**
 * Validates whether the extensibility sub-generator is available and sets it up if necessary.
 * If the generator is not found, an error message is returned advising on the necessary action.
 *
 * @param {boolean} value - A confirm flag indicating whether user wants to continue creating an extension project.
 * @param {boolean} isApplicationSupported - Whether the selected application is supported.
 * @param {boolean} hasSyncViews - Whether synchronized views exist for the app.
 * @returns {boolean | string} Returns true if app is supported and contains sync views, or an error message if not.
 */
export function validateExtensibilityGenerator(
    value: boolean,
    isApplicationSupported: boolean,
    hasSyncViews: boolean
): boolean | string {
    if (value) {
        const generator = resolveNodeModuleGenerator(EXTENSIBILITY_GENERATOR_NS);

        if (!generator) {
            return t('error.extensibilityGenNotFound');
        }

        return true;
    }

    return isApplicationSupported && hasSyncViews ? true : t('prompts.createExtProjectContinueLabel');
}

/**
 * Validates the input parameters for an adaptation project configuration.
 *
 * @param {SystemLookup} systemLookup - The system lookup utility to resolve system names.
 * @param {boolean} isCustomerBase - Indicates if the project is for the customer base layer.
 * @param {JsonInputParams} params - The input parameters to validate.
 * @param {string} params.projectName - The name of the project to validate.
 * @param {string} params.targetFolder - The target folder where the project will be created.
 * @param {string} params.namespace - The namespace of the project to validate.
 * @param {string} params.system - The name of the system to validate.
 * @throws {Error} Throws an error if any of the validations fail:
 * - If the project name is invalid.
 * - If the namespace is invalid.
 * - If the system cannot be resolved.
 * @returns {Promise<void>} Resolves if all validations pass, otherwise throws an error.
 */
export async function validateJsonInput(
    systemLookup: SystemLookup,
    isCustomerBase: boolean,
    { projectName, targetFolder, namespace, system }: JsonInputParams
): Promise<void> {
    let validationResult = validateProjectName(projectName, targetFolder, isCustomerBase);
    if (isString(validationResult)) {
        throw new Error(validationResult);
    }

    validationResult = validateNamespaceAdp(namespace, projectName, isCustomerBase);
    if (isString(validationResult)) {
        throw new Error(validationResult);
    }

    const systemEndpoint = await systemLookup.getSystemByName(system);
    if (!systemEndpoint) {
        throw new Error(t('error.systemNotFound', { system }));
    }
}

/**
 * Validates the target envuironment.
 *
 * @param {TargetEnvironment|undefined} value - The selected target envuironment.
 * @param vscode The VS Code env instance.
 * @returns {Promise<boolean|string>} Resolves with true if the target envuironment
 * is valid otherwise a string representing the corresponding validation error.
 */
export async function validateTargetEnvironment(
    value: TargetEnvironment | undefined,
    vscode: any
): Promise<boolean | string> {
    if (value === undefined) {
        return t('error.targetEnvironmentNotSelected');
    }

    if (isAppStudio() || value !== TargetEnvironment.cloudFoundry) {
        return true;
    }

    const isExternalLoginEnabled = await isCFExternalLoginEnabled(vscode);

    return isExternalLoginEnabled || t('error.cfLoginNotEnabled');
}
