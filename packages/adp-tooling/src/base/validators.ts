import { isAppStudio } from '@sap-ux/btp-utils';
import { OperationsType } from '@sap-ux/axios-extension';
import { t } from '../i18n';
import { existsSync } from 'fs';
import { parseParameters } from './helper';
import { InputChoice } from '../types';

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
 * @param {boolean} isMandatory - Indicates whether the input is mandatory.
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

export async function validateEnvironment(value: OperationsType, loginEnabled: boolean) {
    if (!isNotEmptyString(value)) {
        return t('prompts.inputCannotBeEmpty');
    }

    if (value === 'C' && !isAppStudio()) {
        if (!loginEnabled) {
            return t('validators.externalLoginDisabled');
        }
    }

    return true;
}

export function validateProjectName(
    value: string,
    destinationPath: string,
    isCustomerBase: boolean,
    isCFEnv: boolean
): boolean | string {
    if (!isNotEmptyString(value)) {
        return t('prompts.inputCannotBeEmpty');
    }

    if (/[A-Z]/.test(value)) {
        return t('validators.projectNameUppercaseError');
    }

    if (!isCustomerBase) {
        return validateProjectNameInternal(value, destinationPath, isCFEnv);
    } else {
        return validateProjectNameExternal(value, destinationPath, isCFEnv);
    }
}

export function validateProjectNameExternal(
    value: string,
    destinationPath: string,
    isCFEnv: boolean
): boolean | string {
    const pattern = /^[a-zA-Z]+((\.)?[a-zA-Z0-9])*$/;
    if (pattern.test(value)) {
        if (value.length > 61 || value.toLocaleLowerCase().endsWith('component')) {
            return t('validators.projectNameLengthErrorExt');
        }

        return validateDuplicateProjectName(value, destinationPath, isCFEnv);
    } else {
        return t('validators.projectNameValidationErrorExt');
    }
}

export function validateProjectNameInternal(
    value: string,
    destinationPath: string,
    isCFEnv: boolean
): boolean | string {
    const pattern = /^([a-z]{1,}[a-z0-9]*((\.){1}[a-z]{1,}[a-z0-9]*){1,})+$/i;
    if (pattern.test(value)) {
        if (
            value.toLowerCase().startsWith('customer') ||
            value.length > 61 ||
            value.toLocaleLowerCase().endsWith('component')
        ) {
            return t('validators.projectNameLengthErrorInt');
        }
        return validateDuplicateProjectName(value, destinationPath, isCFEnv);
    } else {
        return t('validators.projectNameValidationErrorInt');
    }
}

export function validateDuplicateProjectName(
    value: string,
    destinationPath: string,
    isCFEnv: boolean
): boolean | string {
    if (existsSync(destinationPath + '/' + value)) {
        return `${isCFEnv ? 'Module' : 'Project'} with this name already exists in your workspace`;
    }

    return true;
}

export function validateNamespace(namespace: string, projectName: string, isCustomerBase: boolean): string | boolean {
    if (!isNotEmptyString(namespace)) {
        return t('prompts.inputCannotBeEmpty');
    }

    if (!isCustomerBase) {
        if (namespace !== projectName) {
            return 'Namespace should be the same as Project Name.';
        }
    } else if (namespace.toLowerCase().startsWith('customer.') !== true) {
        return t('validators.namespaceSameAsProjectNameError');
    } else {
        // simulate the behavior of FullStack as the customer prefix is in another input
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

export function validateClient(value: string): string | boolean {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmpty');
    }

    if (!value.match(/^([0-9])*$/)) {
        return t('validators.systemClientMandatoryError');
    }

    return true;
}

export function validateAch(value: string, isCustomerBase: boolean): string | boolean {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmpty');
    }
    const isValid = value.toUpperCase().match(/^([A-Z0-9]{2,3})(\-[A-Z0-9]{1,6})*$/);

    if (!isCustomerBase && !isValid) {
        return t('validators.achMandatoryError');
    }

    return true;
}

export function validateEmptyInput(value: string, inputName: string): string | boolean {
    if (!isNotEmptyString(value)) {
        return t('validators.inputCannotBeEmptyGeneric', { input: t(`prompts.${inputName}`) });
    }

    return true;
}

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

export function validateAbapRepository(value: string): string | boolean {
    if (!value) {
        return t('validators.inputCannotBeEmptyGeneric', { input: t('prompts.abapRepository') });
    }

    if (!/^(?:[/]\w{1,8}[/])?\w{1,15}$/.test(value)) {
        return t('validators.invalidAbapRepository');
    }

    return true;
}

export async function validatePackageChoiceInput(value: InputChoice, system: string): string | boolean {
    if (value === InputChoice.ENTER_MANUALLY) {
        return true;
    }

    return true;
}
