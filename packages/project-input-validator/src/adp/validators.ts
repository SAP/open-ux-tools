import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { t } from '../i18n';
import { validateEmptyString } from '../general/validators';

/**
 * Validates a value for duplication in existing change files.
 *
 * @param value The value to check for duplication.
 * @param propertyName The property name in the change file objects to check.
 * @param changeFiles The list of existing change files to check against.
 * @returns {boolean} Returns true if a content duplication is found and false if there is no content duplication.
 */
export function hasContentDuplication(
    value: string,
    propertyName: string,
    changeFiles: { content: object }[]
): boolean {
    return changeFiles.some(({ content }) => {
        const contentProperty = (content as Record<string, object>)[propertyName];
        return contentProperty && Object.keys(contentProperty).includes(value);
    });
}

/**
 * Validates a value for starting with a customer prefix.
 *
 * @param value The value to validate.
 * @returns {boolean} True if the value starts with 'customer.' and false if it does not.
 */
export function hasCustomerPrefix(value: string): boolean {
    return value.toLowerCase().startsWith('customer.');
}

/**
 * Validates if a value is a valid data source URI.
 *
 * @param uri The URI to validate.
 * @returns {boolean} True if the URI is valid, false if it is not.
 */
export function isDataSourceURI(uri: string): boolean {
    return /^(?!.*\/\/)\/([^\s]*)\/$/.test(uri);
}

/**
 * Validates that the project name is not empty and it is correct for VENDOR and CUSTOMER_BASE layer.
 *
 * @param {string} value - The project name.
 * @param {string} destinationPath - The project directory.
 * @param {boolean} isCustomerBase - Whether the layer is customer base.
 * @param {boolean} isCfEnv - Whether the project is in a CF environment.
 * @returns {string | boolean} If value is valid returns true otherwise error message.
 */
export function validateProjectName(
    value: string,
    destinationPath: string,
    isCustomerBase: boolean,
    isCfEnv: boolean
): boolean | string {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (/[A-Z]/.test(value)) {
        return t('adp.projectNameUppercaseError');
    }

    if (isCfEnv) {
        return validateDuplicateProjectName(value, destinationPath);
    }

    if (!isCustomerBase) {
        return validateProjectNameInternal(value);
    } else {
        return validateProjectNameExternal(value);
    }
}

/**
 * Validates that project name is valid for CUSTOMER_BASE layer.
 *
 * @param {string} value - The project name.
 * @returns {string | boolean} If value is valid returns true otherwise error message.
 */
export function validateProjectNameExternal(value: string): boolean | string {
    if (value.length > 61 || value.toLocaleLowerCase().endsWith('component')) {
        return t('adp.projectNameLengthErrorExt');
    }
    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(value)) {
        return t('adp.projectNameValidationErrorExt');
    }

    return true;
}

/**
 * Validates that project name is valid for VENDOR layer.
 *
 * @param {string} value - The project name.
 * @returns {string | boolean} If value is valid returns true otherwise error message.
 */
export function validateProjectNameInternal(value: string): boolean | string {
    if (
        value.toLowerCase().startsWith('customer') ||
        value.length > 61 ||
        value.toLocaleLowerCase().endsWith('component')
    ) {
        return t('adp.projectNameLengthErrorInt');
    }

    if (!/^[a-z]+[a-z0-9]*(\.[a-z]+[a-z0-9]*)+$/i.test(value)) {
        return t('adp.projectNameValidationErrorInt');
    }

    return true;
}

/**
 * Validates that project name is unique in directory.
 *
 * @param {string} value - The project name.
 * @param {string} destinationPath - The project directory.
 * @returns {string | boolean} If project with same name already exists return error message otherwise true.
 */
export function validateDuplicateProjectName(value: string, destinationPath: string): boolean | string {
    if (existsSync(join(destinationPath, value))) {
        return t('adp.duplicatedProjectName');
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
export function validateNamespaceAdp(
    namespace: string,
    projectName: string,
    isCustomerBase: boolean
): string | boolean {
    const validationResult = validateEmptyString(namespace);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (!isCustomerBase) {
        if (namespace !== projectName) {
            return t('adp.differentNamespaceThanProjectName');
        }
    } else if (namespace.toLowerCase().startsWith('customer.') !== true) {
        return t('adp.namespaceSameAsProjectNameError');
    } else {
        namespace = namespace.slice('customer.'.length, namespace.length);
    }

    if (namespace.length > 61 || namespace.toLowerCase().endsWith('component') === true) {
        return t('adp.namespaceLengthError');
    } else if (namespace !== '' && /^[a-z]+((\.)?[a-z0-9])*$/.test(namespace) === false) {
        return t('adp.namespaceValidationError');
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
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    const isValid = /^([A-Z0-9]{2,3})(-[A-Z0-9]{1,6})*$/.exec(value.toUpperCase());

    if (!isCustomerBase && !isValid) {
        return t('adp.achMandatoryError');
    }

    return true;
}
