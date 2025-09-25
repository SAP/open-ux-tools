import type { SystemLookup } from '@sap-ux/adp-tooling';
import { validateNamespaceAdp, validateProjectName } from '@sap-ux/project-input-validator';

import { t } from '../../../utils/i18n';
import { isString } from '../../../utils/type-guards';

interface JsonInputParams {
    projectName: string;
    targetFolder: string;
    namespace: string;
    system: string;
}

interface ValidateExtensibilityExtParams {
    value: boolean;
    isApplicationSupported: boolean;
    hasSyncViews: boolean;
    isExtensibilityExtInstalled: boolean;
}

/**
 * Validates whether the extensibility extension is available. If the extension is not found,
 * an error message is returned advising on the necessary action.
 *
 * @param {ValidateExtensibilityExtParams} params - The validation parameters.
 * @param {boolean} params.value - A confirm flag indicating whether user wants to continue creating an extension project.
 * @param {boolean} params.isApplicationSupported - Whether the selected application is supported.
 * @param {boolean} params.hasSyncViews - Whether synchronized views exist for the app.
 * @param {boolean} params.isExtensibilityExtInstalled - Whether the extensibility extension is installed.
 * @returns {boolean | string} Returns true if app is supported and contains sync views, or an error message if not.
 */
export function validateExtensibilityExtension({
    value,
    isApplicationSupported,
    hasSyncViews,
    isExtensibilityExtInstalled
}: ValidateExtensibilityExtParams): boolean | string {
    if (value) {
        if (!isExtensibilityExtInstalled) {
            return t('error.extensibilityExtensionNotFound');
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
