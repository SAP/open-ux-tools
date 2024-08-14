import { existsSync } from 'fs';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { AbapServiceProvider, OperationsType } from '@sap-ux/axios-extension';

import { t } from '../i18n';
import { InputChoice } from '../types';
import { parseParameters } from '../base/services/flp-parameters';
import { listPackages, listTransports } from './services';

/**
 * Checks if the input is a valid SAP client.
 *
 * @param input - input to check
 * @returns true if the input is a valid SAP client
 */
export function isValidSapClient(input: string | undefined): boolean {
    return !input || (input.length < 4 && !!new RegExp(/^\d*$/).exec(input));
}

/**
 * Checks if the input is a non-empty string.
 *
 * @param input - input to check
 * @returns true if the input is a non-empty string
 */
export function isNotEmptyString(input: string | undefined): boolean {
    return typeof input === 'string' && input.trim().length > 0;
}

/**
 * Checks if the given string contains any whitespace characters.
 *
 * @param {string} value - The string to check for whitespace characters.
 * @returns {boolean} Returns true if the string contains any whitespace; otherwise, returns false.
 */
export function hasEmptySpaces(value: string): boolean {
    return /\s/.test(value);
}

/**
 * Validates that the input is non-empty and contains no whitespace characters.
 *
 * @param {string} value - The input value to validate.
 * @param {string | undefined} input - The name of the input field being validated, used for error messaging.
 * @param {boolean} [isMandatory] - Indicates whether the input is mandatory.
 * @returns {string | boolean} Returns true if the input is valid. If invalid, returns a localized error message.
 */
export function validateNonEmptyNoSpaces(
    value: string,
    input: string | undefined,
    isMandatory = true
): string | boolean {
    if (!isNotEmptyString(value)) {
        return isMandatory ? t('validators.cannotBeEmpty', { input }) : true;
    }

    if (hasEmptySpaces(value)) {
        return t('validators.cannotHaveSpaces', { input });
    }

    return true;
}

/**
 * Validates environment.
 *
 * @param {OperationsType} value - The environment.
 * @param {boolean} loginEnabled - If external login is enabled.
 * @returns {string | boolean } If value is valid returns true otherwise error message.
 */
export function validateEnvironment(value: OperationsType, loginEnabled: boolean): string | boolean {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmpty');
    }

    if (value === 'C' && !isAppStudio()) {
        if (!loginEnabled) {
            return t('validators.externalLoginDisabled');
        }
    }

    return true;
}

/**
 * Validates that the project name is not empty and it is correct for VENDOR and CUSTOMER_BASE layer.
 *
 * @param {string} value - The project name.
 * @param {string} destinationPath - The project directory.
 * @param {boolean} isCustomerBase - Whether the layer is customer base.
 * @returns {string | boolean} If value is valid returns true otherwise error message.
 */
export function validateProjectName(value: string, destinationPath: string, isCustomerBase: boolean): boolean | string {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmpty');
    }

    if (/[A-Z]/.test(value)) {
        return t('validators.projectNameUppercaseError');
    }

    if (!isCustomerBase) {
        return validateProjectNameInternal(value, destinationPath);
    } else {
        return validateProjectNameExternal(value, destinationPath);
    }
}

/**
 * Validates that project name is valid for CUSTOMER_BASE layer.
 *
 * @param {string} value - The project name.
 * @param {string} destinationPath - The project directory.
 * @returns {string | boolean} If value is valid returns true otherwise error message.
 */
export function validateProjectNameExternal(value: string, destinationPath: string): boolean | string {
    if (value.length > 61 || value.toLocaleLowerCase().endsWith('component')) {
        return t('validators.projectNameLengthErrorExt');
    }

    const pattern = /^(\w\.\w|[a-zA-Z0-9]){1,61}$/;
    if (!pattern.test(value)) {
        return t('validators.projectNameValidationErrorExt');
    }

    return validateDuplicateProjectName(value, destinationPath);
}

/**
 * Validates that project name is valid for VENDOR layer.
 *
 * @param {string} value - The project name.
 * @param {string} destinationPath - The project directory.
 * @returns {string | boolean} If value is valid returns true otherwise error message.
 */
export function validateProjectNameInternal(value: string, destinationPath: string): boolean | string {
    const pattern = /^([a-z]+[a-z0-9]*((\.)[a-z]+[a-z0-9]*)+)+$/i;
    if (pattern.test(value)) {
        if (
            value.toLowerCase().startsWith('customer') ||
            value.length > 61 ||
            value.toLocaleLowerCase().endsWith('component')
        ) {
            return t('validators.projectNameLengthErrorInt');
        }
        return validateDuplicateProjectName(value, destinationPath);
    } else {
        return t('validators.projectNameValidationErrorInt');
    }
}

/**
 * Validates that project name is unique in directory.
 *
 * @param {string} value - The project name.
 * @param {string} destinationPath - The project directory.
 * @returns {string | boolean} If project with same name already exists return error message otherwise true.
 */
export function validateDuplicateProjectName(value: string, destinationPath: string): boolean | string {
    if (existsSync(destinationPath + '/' + value)) {
        return 'Project with this name already exists in your workspace';
    }

    return true;
}

/**
 * Validates that the project name is valid. Checks that it is not empty string and it is valid for CUSTOMER_BASE and VENDOR layers.
 *
 * @param {string} namespace - The project namespace.
 * @param {string} projectName - The project name.
 * @param {boolean} isCustomerBase - Whether the layer is customer base.
 * @returns {string | boolean} If project namespace is valid returns true otherwise error message.
 */
export function validateNamespace(namespace: string, projectName: string, isCustomerBase: boolean): string | boolean {
    if (!isNotEmptyString(namespace)) {
        return t('validators.inputCannotBeEmpty');
    }

    if (!isCustomerBase) {
        if (namespace !== projectName) {
            return 'Namespace should be the same as Project Name.';
        }
    } else if (namespace.toLowerCase().startsWith('customer.') !== true) {
        return t('validators.namespaceSameAsProjectNameError');
    } else {
        namespace = namespace.slice('customer.'.length, namespace.length);
    }

    const pattern = /^[a-zA-Z]+((\.)?[a-zA-Z0-9])*$/;

    if (namespace.length > 61 || namespace.toLowerCase().endsWith('component') === true) {
        return t('validators.namespaceLengthError');
    } else if (namespace !== '' && pattern.test(namespace) === false) {
        return t('validators.namespaceValidationError');
    }

    return true;
}

/**
 * Validates that system client is not empty string and it is numeric.
 *
 * @param {string} value - The system client.
 * @returns {string | boolean} If system client is valid returns true otherwise error message.
 */
export function validateClient(value: string): string | boolean {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmpty');
    }

    if (!/^\d*$/.exec(value)) {
        return t('validators.systemClientMandatoryError');
    }

    return true;
}

/**
 * Validates that application ACH is not empty and it is in correct format.
 *
 * @param {string} value - The application component hierarchy.
 * @param {boolean} isCustomerBase - Whether the layer is customer base.
 * @returns {string | boolean} If application ACH is valid returns true otherwise error message.
 */
export function validateAch(value: string, isCustomerBase: boolean): string | boolean {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmpty');
    }

    const isValid = /^([A-Z0-9]{2,3})(-[A-Z0-9]{1,6})*$/.exec(value.toUpperCase());

    if (!isCustomerBase && !isValid) {
        return t('validators.achMandatoryError');
    }

    return true;
}

/**
 * Validates that input is not empty.
 *
 * @param {string} value - The value that will be validated.
 * @param {string} inputName - The input name.
 * @returns {string | boolean} if input is not empty returns true otherwise error message.
 */
export function validateEmptyInput(value: string, inputName: string): string | boolean {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmptyGeneric', { input: t(`prompts.${inputName}`) });
    }

    return true;
}

/**
 * Validates that value matches regex pattern.
 *
 * @param {string} value - The value that will be validated.
 * @param {string} inputName - The input name.
 * @param {string} pattern - The regex pattern.
 * @returns {string | boolean} if value matches regex pattern returns true otherwise error message.
 */
export function validateByRegex(value: string, inputName: string, pattern: string): string | boolean {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmptyGeneric', { input: t(`prompts.${inputName}`) });
    }

    const regex = new RegExp(pattern, 'g');
    if (!regex.test(value)) {
        return t(`validators.invalid${inputName}`);
    }

    return true;
}

/**
 * Validates that FLP Parameters are in correct format.
 *
 * @param {string} paramString - The FLP Parameters string
 * @returns {string | boolean} If parameters are in correct format returns true otherwise error message.
 */
export function validateParameters(paramString: string): string | boolean {
    if (!paramString) {
        return true;
    }

    try {
        parseParameters(paramString);
    } catch (error) {
        return error.message;
    }

    return true;
}

/**
 * Validates that ABAP Repository is not empty and it is in correct format.
 * It can starts with a namespace up from 1 to 8 characters placed inside /{namespace}/ and the value can be up to 15 characters including the namespace if it is defined.
 *
 * @param {string} value - The ABAP Repository.
 * @returns {string | boolean} If value is not empty and it is in correct format returns true otherwise error message.
 */
export function validateAbapRepository(value: string): string | boolean {
    if (!value) {
        return t('validators.inputCannotBeEmptyGeneric', { input: t('prompts.abapRepository') });
    }

    if (!/^(?:\/\w{1,8}\/)?\w{1,15}$/.test(value)) {
        return t('validators.invalidAbapRepository');
    }

    return true;
}

/**
 * Validates the user's choice for selecting an ABAP package.
 * This function checks if the user wants to enter the package name manually or selects it from a list.
 * If not entering manually, it verifies that there are available packages by listing them from the ABAP system.
 *
 * @param {InputChoice} value - The user's choice on how to input the package name.
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @returns {Promise<string | boolean>} A promise that resolves to true if the input choice is valid or a validation error message otherwise.
 */
export async function validatePackageChoiceInput(
    value: InputChoice,
    provider: AbapServiceProvider
): Promise<string | boolean> {
    if (value === InputChoice.ENTER_MANUALLY) {
        return true;
    }
    try {
        const packages = await listPackages('', provider);
        if (!packages || (packages && packages.length === 0)) {
            return t('validators.abapPackagesNotFound');
        }
    } catch (error) {
        return t('validators.abapPackagesNotFound');
    }

    return true;
}

/**
 * Validates the format, namespace, and prefix of a given package name against a repository.
 * This function ensures the package name is not empty, follows a specific format, belongs to the correct namespace,
 * and starts with a valid prefix.
 *
 * @param {string} value - The package name to validate.
 * @param {string} repository - The repository name against which the package name should be validated.
 * @returns {string | undefined} An error message if the validation fails, or undefined if the package name is valid.
 */
export function validatePackage(value: string, repository: string): string | undefined {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmptyGeneric', { input: t(`prompts.package`) });
    }

    //Validation for format
    if (!/^(?:\/\w+\/)?[$]?\w*$/.test(value)) {
        return t('validators.package.invalidFormat');
    }

    //Validation for repository namespace
    if (value.startsWith('/')) {
        const valueParts = value.split('/').filter((el) => el !== '');
        const packageNamespace = valueParts[0];
        if (!repository.startsWith(`/${packageNamespace}/`)) {
            return t('validators.package.invalidRepositoryNamespace');
        }

        return undefined;
    }

    //Validation for prefix
    const startPrefix = value.startsWith('SAP') ? 'SAP' : value[0];
    const allowedPrefixes = ['$', 'Z', 'Y', 'SAP'];
    if (!allowedPrefixes.find((el) => el === startPrefix)) {
        return t('validators.package.invalidStartingPrefix');
    }

    //Validation for repository prefix
    if (repository && !value.startsWith('$') && !repository.startsWith(startPrefix)) {
        return t('validators.package.invalidRepositoryNamespace');
    }

    return undefined;
}

/**
 * Validates the user's choice of transport request input method for an ABAP package.
 * If choosing from existing transport requests, it checks that the package and repository are specified,
 * and that there are available transport requests.
 *
 * @param {InputChoice} value - The user's transport choice input method.
 * @param {string} packageName - The package name involved in the transport operation.
 * @param {string} repository - The repository associated with the package.
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @returns {Promise<string | boolean>} A promise that resolves to true if the input method is valid,
 *                                      or an error message string if there are issues with the prerequisites or fetching transports.
 */
export async function validateTransportChoiceInput(
    value: InputChoice,
    packageName: string,
    repository: string,
    provider: AbapServiceProvider
): Promise<string | boolean> {
    try {
        if (!value) {
            return t('validators.chooseTransportInput');
        }
        if (value === InputChoice.CHOOSE_FROM_EXISTING) {
            if (!packageName || !repository) {
                return t('validators.invalidTranposportPrereq');
            }

            const transportList = await listTransports(packageName, repository, provider);
            if (!transportList || (transportList && transportList.length === 0)) {
                return t('validators.errorFetchingTransports');
            }
        }

        return true;
    } catch (error) {
        return t('validators.errorFetchingTransports');
    }
}
