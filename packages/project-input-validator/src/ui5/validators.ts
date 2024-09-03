import { join, posix } from 'path';
import { t } from '../i18n';
import { existsSync, lstatSync, accessSync, constants } from 'fs';
import validateNpmPackageName from 'validate-npm-package-name';

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
        return t('ui5.namespaceMustStartWithLetter');
    }
    if (namespace.endsWith('.')) {
        return t('ui5.namespaceEndInPeriod');
    }
    if (namespace.toUpperCase() === 'SAP') {
        return t('ui5.namespaceCannotBeSap', { str: namespace });
    }
    if (namespace.toLowerCase().startsWith('new')) {
        return t('ui5.namespaceStartsWithNew', { str: namespace.substring(0, 3) });
    }
    if (/\.\d/.test(namespace)) {
        return t('ui5.namespaceNumberAfterPeriod');
    }

    if (allowUnderscore && !/^[\w.]+$/.test(namespace)) {
        return t('ui5.namespaceSpecialCharacter');
    } else if (!allowUnderscore && !/^[a-z0-9.]*$/g.test(namespace)) {
        return t('ui5.lowerAlphaNumericDotsOnly');
    }

    if ((moduleName + namespace).length > 70) {
        return t('ui5.nameCombinedTooLong', { length: 70 });
    }

    if (namespace.toLowerCase() !== namespace) {
        return t('ui5.inputValueContainsCapital', { promptName: 'Namespace' });
    }

    return true;
}
/**
 * Validator: UI5 namespace.
 *
 * @param namespace - namepsace to validate
 * @param moduleName - module name
 * @param allowUnderscore - is underscore characters allowed
 * @returns true if valid, otherwise an error message string for use in Inquirer validation functions
 */
export function validateNamespace(namespace: string, moduleName?: string, allowUnderscore = true): boolean | string {
    if (!namespace) {
        return false;
    }
    return validateNamespacePattern(namespace, moduleName, allowUnderscore);
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
        return t('ui5.lowerAlphaNumericOnly');
    }

    return true;
}

/**
 * Validator: UI5 project directory can be used to create a UI5 application.
 *
 * @param targetFolder - the directory path not including the application folder (UI5 application name)
 * @param projectName - the UI5 application directory name
 * @returns true if valid, otherwise an error message string for use in Inquirer validation function
 */
export function validateProjectFolder(targetFolder: string, projectName: string): boolean | string {
    if (!folderExists(targetFolder)) {
        return t('ui5.folderDoesNotExist');
    }
    if (!folderWritePermExists(targetFolder)) {
        return t('ui5.folderDoesNotHaveCorrectPermissions');
    }
    if (containsFioriProject(targetFolder)) {
        return t('ui5.folderContainsFioriApp');
    }
    if (targetFolder && targetFolder.length > 0 && !folderExists(join(targetFolder, projectName))) {
        return true;
    } else if (targetFolder && targetFolder.length > 0 && folderExists(join(targetFolder, projectName))) {
        return t('ui5.moduleAlreadyExists', { folderName: projectName });
    } else {
        return t('ui5.enterProjectFolder');
    }
}

/**
 * Validator: UI5 package json module name validator. Validates a module name accoding to npm package rules and some additional UI5 specific rules.
 *
 * @param moduleName - module name to validate
 * @returns true if valid, otherwise an error message string for use in Inquirer validation functions
 */
export function validateModuleName(moduleName: string): boolean | string {
    if (/^[^a-zA-Z]/.test(moduleName)) {
        return t('ui5.moduleNameMustStartWithLetter');
    }
    if (moduleName?.length > 70) {
        return t('ui5.nameTooLong', { length: 70 });
    }
    if (moduleName?.length < 3) {
        return t('ui5.nameTooShort', { length: 3 });
    }
    // convert the validation strings from `validateNpmPackageName` to required texts
    const messageMap = {
        'name cannot be null': t('ui5.nameNull'),
        'name cannot be undefined': t('ui5.nameUndefined'),
        'name must be a string': t('ui5.nameNotString'),
        'name length must be greater than zero': t('ui5.nameLengthZero'),
        'name cannot start with a period': t('ui5.nameStartsWithPeriod'),
        'name cannot start with an underscore': t('ui5.nameStartsWithUnderscore'),
        'name cannot contain leading or trailing spaces': t('ui5.nameStartsOrEndsWithSpace'),
        [moduleName + ' is a blocklisted name']: t('ui5.nameBlocklisted', { moduleName }),
        [moduleName + ' is a core module name']: t('ui5.nameIsCoreModule', { moduleName }),
        'name can no longer contain more than 214 characters': t('ui5.nameTooLong', { length: 214 }),
        'name can no longer contain capital letters': t('ui5.inputValueContainsCapital', {
            promptName: 'Module'
        }),
        'name can no longer contain special characters ("~\'!()*")': t('ui5.nameContainsSpecialCharacters'),
        'name can only contain URL-friendly characters': t('ui5.nameNotUrlFriendly')
    };
    const valid = validateNpmPackageName(moduleName);
    if (valid.validForNewPackages && valid.validForOldPackages) {
        return true;
    }
    return [...(valid.errors ?? []), ...(valid.warnings ?? [])]
        .filter((msg) => !!msg)
        .map((msg) => messageMap[msg] ?? t('ui5.invalidModuleName'))
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
/**
 * Test if folder already contains an existing fiori project.
 *
 * @param dirPath - path to the directory to test
 * @returns true, if its a fiori project.
 */
function containsFioriProject(dirPath: string): boolean {
    const webappPath = join(dirPath, 'webapp');
    return existsSync(webappPath);
}
