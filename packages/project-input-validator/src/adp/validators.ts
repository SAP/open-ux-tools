import { existsSync } from 'fs';
import { t } from '../i18n';
import { isEmptyString, validateEmptyString, validateSpecialChars } from '../general/validators';
import { isAbsolute, join, sep } from 'path';

const projectNamePattern = /^(\w\.\w|[a-zA-Z0-9]){1,61}$/;

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
 * @returns {string | boolean} If value is valid returns true otherwise error message.
 */
export function validateProjectName(value: string, destinationPath: string, isCustomerBase: boolean): boolean | string {
    if (isEmptyString(value)) {
        return t('general.inputCannotBeEmpty');
    }

    if (/[A-Z]/.test(value)) {
        return t('adp.projectNameUppercaseError');
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
        return t('adp.projectNameLengthErrorExt');
    }

    if (!projectNamePattern.test(value)) {
        return t('adp.projectNameValidationErrorExt');
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
    if (
        value.toLowerCase().startsWith('customer') ||
        value.length > 61 ||
        value.toLocaleLowerCase().endsWith('component')
    ) {
        return t('adp.projectNameLengthErrorInt');
    }

    if (!projectNamePattern.test(value)) {
        return t('adp.projectNameValidationErrorInt');
    }

    return validateDuplicateProjectName(value, destinationPath);
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
    if (isEmptyString(namespace)) {
        return t('general.inputCannotBeEmpty');
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
    } else if (namespace !== '' && projectNamePattern.test(namespace) === false) {
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
    if (isEmptyString(value)) {
        return t('general.inputCannotBeEmpty');
    }

    const isValid = /^([A-Z0-9]{2,3})(-[A-Z0-9]{1,6})*$/.exec(value.toUpperCase());

    if (!isCustomerBase && !isValid) {
        return t('adp.achMandatoryError');
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
    if (isEmptyString(value)) {
        return t('general.inputCannotBeEmpty');
    }

    if (!/^(?:\/\w{1,8}\/)?\w{1,15}$/.test(value)) {
        return t('adp.invalidAbapRepository');
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
export function validatePackageAdp(value: string, repository: string): string | undefined {
    if (isEmptyString(value)) {
        return t('general.inputCannotBeEmpty');
    }

    //Validation for format
    if (!/^(?:\/\w+\/)?[$]?\w*$/.test(value)) {
        return t('adp.package.invalidFormat');
    }

    //Validation for repository namespace
    if (value.startsWith('/')) {
        const valueParts = value.split('/').filter((el) => el !== '');
        const packageNamespace = valueParts[0];
        if (!repository.startsWith(`/${packageNamespace}/`)) {
            return t('adp.package.invalidRepositoryNamespace');
        }

        return undefined;
    }

    //Validation for prefix
    const startPrefix = value.startsWith('SAP') ? 'SAP' : value[0];
    const allowedPrefixes = ['$', 'Z', 'Y', 'SAP'];
    if (!allowedPrefixes.find((el) => el === startPrefix)) {
        return t('adp.package.invalidStartingPrefix');
    }

    //Validation for repository prefix
    if (repository && !value.startsWith('$') && !repository.startsWith(startPrefix)) {
        return t('adp.package.invalidRepositoryNamespace');
    }

    return undefined;
}

/**
 * Validates the flp action if it is in valid format, only alphanumerical characters and '_' up to 60 characters.
 *
 * @param value The value to validate.
 * @returns {boolean} True if validation passes, or an error message if validation fails.
 */
export function validateAction(value: string): string | boolean {
    return validateSpecialChars(value, '^[A-Za-z0-9_]{0,60}$', t('adp.invalidAction'));
}

/**
 * Validates the flp semantic object if it is in valid format, only alphanumerical characters and '_' up to 30 characters.
 *
 * @param value The value to validate.
 * @returns {boolean} True if validation passes, or an error message if validation fails.
 */
export function validateSemanticObject(value: string): string | boolean {
    return validateSpecialChars(value, '^[A-Za-z0-9_]{0,30}$', t('adp.invalidSemanticObject'));
}

/**
 * Validates if selected annotation file is valid.
 *
 * @param value The annotation file
 * @param basePath The base path of the project
 * @returns {boolean} True if validation passes, or an error message if validation fails.
 */
export function validateAnnotationFile(value: string, basePath: string): string | boolean {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    const filePath = isAbsolute(value) ? value : join(basePath, value);
    if (!existsSync(filePath)) {
        return t('adp.fileDoesNotExist');
    }

    const fileName = filePath.split(sep).pop();

    if (!fileName) {
        return t('adp.fileDoesNotExist');
    }

    if (existsSync(join(basePath, 'webapp', 'changes', 'annotations', fileName))) {
        return t('adp.annotationFileAlreadyExists');
    }

    return true;
}
