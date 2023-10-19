import { join } from 'path';
import { t } from '../utility/i18n';
import { existsSync, lstatSync } from 'fs';
import validateNpmPackageName from 'validate-npm-package-name';
import { accessSync, constants } from 'fs';
import { posix } from 'path';

/**
 * Validator: UI5 application namespace.
 *
 * @param namespace - namespace
 * @param moduleName - module name
 * @param allowUnderscore - should allow underscores in namespace
 * @returns true if valid, otherwise an error message string for use in Inquirer validation functions
 */
function validateNamespacePattern(namespace: string, moduleName = '', allowUnderscore = true): boolean | string {
    // Since namespace is concatenated with name to write the app id to the yamls we must comply with the yaml specVersion validation
    // https://sap.github.io/ui5-tooling/stable/pages/Configuration/#name

    if (!/^[a-zA-Z]/.test(namespace)) {
        return t('validationError.namespaceMustStartWithLetter');
    }
    if (/\.$/.test(namespace)) {
        return t('validationError.namespaceEndInPeriod');
    }
    if (namespace.toUpperCase() === 'SAP') {
        return t('validationError.namespaceCannotBeSap', { str: namespace });
    }
    if (namespace.toLowerCase().startsWith('new')) {
        return t('validationError.namespaceStartsWithNew', { str: namespace.substring(0, 3) });
    }
    if (/\.\d/.test(namespace)) {
        return t('validationError.namespaceNumberAfterPeriod');
    }

    if (allowUnderscore && !/^[\w\d.]+$/.test(namespace)) {
        return t('validationError.namespaceSpecialCharacter');
    } else if (!allowUnderscore && !/^[a-z0-9.]*$/g.test(namespace)) {
        return t('validationError.lowerAlphaNumericDotsOnly');
    }

    if ((moduleName + namespace).length > 70) {
        return t('validationError.nameCombinedTooLong', { length: 70 });
    }

    if (namespace.toLowerCase() !== namespace) {
        return t('validationError.inputValueContainsCapital', { promptName: 'Namespace' });
    }

    return true;
}
/**
 * Validator: UI5 library namespace.
 *
 * @param namespace - namepsace to validate
 * @param moduleName - module name
 * @returns true if valid, otherwise an error message string for use in Inquirer validation functions
 */
export function validateLibNamespace(namespace: string, moduleName?: string): boolean | string {
    if (!namespace) {
        return false;
    }
    return validateNamespacePattern(namespace, moduleName, false);
}

/**
 * Validator: UI5 library module name.
 *
 * @param libName - library module name
 * @returns true if valid, otherwise an error message string for use in Inquirer validation functions
 */
export function validateLibModuleName(libName: string): boolean | string {
    const isValid = validateModuleName(libName);
    if (typeof isValid === 'string') {
        return isValid;
    }

    if (!/^[a-z0-9]*$/g.test(libName)) {
        return t('validationError.lowerAlphaNumericOnly');
    }

    return true;
}

/**
 * Validator: project directory.
 *
 * @param targetFolder - the directory path not including the application folder (UI6 application name)
 * @param projectName - the UI5 application directory name
 * @returns true if valid, otherwise an error message string for use in Inquirer validation function
 */
export function validateProjectFolder(targetFolder: string, projectName: string): boolean | string {
    if (!folderExists(targetFolder)) {
        return t('validationError.folderDoesNotExist');
    }
    if (!folderWritePermExists(targetFolder)) {
        return t('validationError.folderDoesNotHaveCorrectPermissions');
    }

    if (targetFolder && targetFolder.length > 0 && !folderExists(join(targetFolder, projectName))) {
        return true;
    } else if (targetFolder && targetFolder.length > 0 && folderExists(join(targetFolder, projectName))) {
        return t('validationError.moduleAlreadyExists');
    } else {
        return t('validationError.enterProjectFolder');
    }
}

/**
 * Validator: validates a module name accoding to npm package rules.
 *
 * @param moduleName - module name to validate
 * @returns true if valid, otherwise an error message string for use in Inquirer validation functions
 */
export function validateModuleName(moduleName: string): boolean | string {
    if (/^[^a-zA-Z]/.test(moduleName)) {
        return t('validationError.moduleNameMustStartWithLetter');
    }
    if (moduleName?.length > 70) {
        return t('validationError.nameTooLong', { length: 70 });
    }
    if (moduleName?.length < 3) {
        return t('validationError.nameTooShort', { length: 3 });
    }
    const messageMap = {
        'name cannot be null': t('validationError.nameNull'),
        'name cannot be undefined': t('validationError.nameUndefined'),
        'name must be a string': t('validationError.nameNotString'),
        'name length must be greater than zero': t('validationError.nameLengthZero'),
        'name cannot start with a period': t('validationError.nameStartsWithPeriod'),
        'name cannot start with an underscore': t('validationError.nameStartsWithUnderscore'),
        'name cannot contain leading or trailing spaces': t('validationError.nameStartsOrEndsWithSpace'),
        [moduleName + ' is a blocklisted name']: t('validationError.nameBlocklisted', { moduleName }),
        [moduleName + ' is a core module name']: t('validationError.nameIsCoreModule', { moduleName }),
        'name can no longer contain more than 214 characters': t('validationError.nameTooLong', { length: 214 }),
        'name can no longer contain capital letters': t('validationError.INPUT_VALUE_CONTAINS_CAPITAL', {
            promptName: 'Module'
        }),
        'name can no longer contain special characters ("~\'!()*")': t(
            'validationError.NAME_CONTAINS_SPECIAL_CHARACTERS'
        ),
        'name can only contain URL-friendly characters': t('validationError.NAME_NOT_URL_FRIENDLY')
    };
    const valid = validateNpmPackageName(moduleName);
    if (valid.validForNewPackages && valid.validForOldPackages) {
        return true;
    }
    return [...(valid.errors || []), ...(valid.warnings || [])]
        .filter((msg) => !!msg)
        .map((msg) => messageMap[msg] || t('validationError.invalidModuleName'))
        .join(', ');
}

/**
 * Test for existence of specified directory path.
 *
 * @param dirPath - directory path
 * @returns true if the directory exists, false if not or validation error message
 */
function folderExists(dirPath: string): boolean | string {
    if (dirPath && typeof dirPath !== 'string') {
        return t('ERROR_NAME_NOT_STRING');
    }
    return existsSync(dirPath) && lstatSync(dirPath).isDirectory();
}

/**
 * Test for directory write permissions.
 *
 * @param dirPath - path to the directory to test
 * @returns true, if write is allowed
 */
function folderWritePermExists(dirPath: string): boolean {
    let folderPerm = true;
    const isWin = process.platform === 'win32';
    try {
        accessSync(isWin ? posix.basename(dirPath) : dirPath, constants.W_OK);
    } catch (err) {
        folderPerm = false;
    }
    return folderPerm;
}
