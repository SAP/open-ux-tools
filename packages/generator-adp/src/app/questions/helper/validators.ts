import fs from 'fs';

import { YamlUtils, type FDCService, type SystemLookup } from '@sap-ux/adp-tooling';
import { validateNamespaceAdp, validateProjectName } from '@sap-ux/project-input-validator';

import { t } from '../../../utils/i18n';
import { isString } from '../../../utils/type-guards';
import { resolveNodeModuleGenerator } from '../../extension-project';
import { isAppStudio } from '@sap-ux/btp-utils';

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
        const generator = resolveNodeModuleGenerator();

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
 * @param {string} label - The label to validate.
 * @param {FDCService} fdcService - The FDC service instance.
 * @returns {Promise<string | boolean>} Returns true if the environment is valid, otherwise returns an error message.
 */
export async function validateEnvironment(
    value: string,
    label: string,
    fdcService: FDCService
): Promise<string | boolean> {
    if (!value) {
        return t('error.selectCannotBeEmptyError', { value: label });
    }

    if (value === 'CF' && !isAppStudio()) {
        const isExternalLoginEnabled = await fdcService.isExternalLoginEnabled();
        if (!isExternalLoginEnabled) {
            return 'CF Login cannot be detected as extension in current installation of VSCode, please refer to documentation (link not yet available) in order to install it.';
        }
    }

    return true;
}

/**
 * Validates the project path.
 *
 * @param {string} projectPath - The path to the project.
 * @param {FDCService} fdcService - The FDC service instance.
 * @returns {Promise<string | boolean>} Returns true if the project path is valid, otherwise returns an error message.
 */
export async function validateProjectPath(projectPath: string, fdcService: FDCService): Promise<string | boolean> {
    if (!projectPath) {
        return 'Input cannot be empty';
    }

    try {
        fs.realpathSync(projectPath, 'utf-8');
    } catch (e) {
        return 'The project does not exist.';
    }

    if (!fs.existsSync(projectPath)) {
        return 'The project does not exist.';
    }

    if (!YamlUtils.isMtaProject(projectPath)) {
        return 'Provide the path to the MTA project where you want to have your Adaptation Project created';
    }

    let services: string[];
    try {
        services = await fdcService.getServices(projectPath);
    } catch (err) {
        services = [];
    }

    if (services.length < 1) {
        return 'No adaptable business service found in the MTA';
    }

    return true;
}
