import fs from 'node:fs';
import { join } from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import { isMtaProject } from '@sap-ux/adp-tooling';
import type { CfConfig, SystemLookup } from '@sap-ux/adp-tooling';
import { validateEmptyString, validateNamespaceAdp, validateProjectName } from '@sap-ux/project-input-validator';

import { t } from '../../../utils/i18n.js';
import { MtaMode } from '../../types.js';
import { isString } from '../../../utils/type-guards.js';

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
    let validationResult = validateProjectName(projectName, targetFolder, isCustomerBase, false);
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
 * Validates the environment.
 *
 * @param {string} value - The value to validate.
 * @param {boolean} isCFLoggedIn - Whether Cloud Foundry is logged in.
 * @param {CfConfig} cfConfig - The CF configuration.
 * @returns {Promise<string | boolean>} Returns true if the environment is valid, otherwise returns an error message.
 */
export async function validateEnvironment(
    value: string,
    isCFLoggedIn: boolean,
    cfConfig?: CfConfig
): Promise<string | boolean> {
    if (value === 'CF' && !isCFLoggedIn) {
        return t('error.cfNotLoggedIn');
    }

    if (value === 'CF' && isCFLoggedIn && (!cfConfig?.org?.Name || !cfConfig?.space?.Name)) {
        return t('error.cfOrgSpaceMissing');
    }

    return true;
}

/**
 * Validates the project path for the CF Project Path page.
 *
 * In `existing` mode the path must be an existing MTA project; a missing service definition is no
 * longer an error since the new service-instance dropdown lets the developer bind one. In `new`
 * mode the path is the parent folder in which a new MTA project will be scaffolded, so it only has
 * to exist (the MTA name/uniqueness is validated by the dedicated name prompt).
 *
 * @param {string} projectPath - The path to the project (existing MTA root, or parent folder for new).
 * @param {ToolsLogger} logger - The logger.
 * @param {MtaMode} [mtaMode] - The selected MTA mode; defaults to `existing`.
 * @returns {Promise<string | boolean>} Returns true if the project path is valid, otherwise returns an error message.
 */
export async function validateProjectPath(
    projectPath: string,
    logger: ToolsLogger,
    mtaMode: MtaMode = MtaMode.Existing
): Promise<string | boolean> {
    const validationResult = validateEmptyString(projectPath);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (!fs.existsSync(projectPath)) {
        return t('error.projectDoesNotExist');
    }

    if (mtaMode === MtaMode.New) {
        return true;
    }

    if (!isMtaProject(projectPath)) {
        return t('error.projectDoesNotExistMta');
    }

    return true;
}

/**
 * Validates the MTA project name entered when creating a new MTA project.
 *
 * Ensures the name is non-empty, uses only allowed characters (letters, numbers, dots,
 * underscores, hyphens; starting with a letter or number) and that no folder with that name
 * already exists in the selected parent location.
 *
 * @param {string} value - The MTA project name to validate.
 * @param {string} [parentPath] - The parent folder the new MTA project will be created in.
 * @returns {string | boolean} Returns true if valid, otherwise an error message.
 */
export function validateMtaId(value: string, parentPath?: string): string | boolean {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
        return t('error.mtaIdInvalid');
    }

    if (parentPath && fs.existsSync(join(parentPath, value))) {
        return t('error.mtaIdAlreadyExists');
    }

    return true;
}

/**
 * Validate business solution name.
 *
 * @param {string} value - Value to validate.
 * @returns {string | boolean} Validation result.
 */
export function validateBusinessSolutionName(value: string): string | boolean {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (/^[a-z0-9][a-z0-9._-]*$/.test(value)) {
        return true;
    }

    return t('error.businessSolutionNameInvalid');
}
