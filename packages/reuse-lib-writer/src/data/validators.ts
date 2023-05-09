import semVer from 'semver';
import { t } from '../i18n';
import type { UI5LibConfig } from '../types';

/**
 * Validates the specified lib name to ensure we do not create malformed documents.
 *
 * @param libName name for library
 * @throws Error with validation message, if the app id is not valid
 * @returns true, if app id is validated
 */
export function validateLibName(libName: string): boolean {
    if (!libName) {
        throw new Error(t('error.missingRequiredProperty', { propertyName: 'libraryName' }));
    }
    const match = libName.match(/["]/);
    if (match) {
        throw new Error(
            t('error.disallowedCharacters', { propertyName: 'libraryName', disallowedChars: `${match.join()}` })
        );
    }
    return true;
}

/**
 *
 * Validates the namespace using regex pattern.
 *
 * @param namespace namespace specified
 * @param libName name for library
 * @throws Error with validation message, if the namespace is not valid
 * @returns if namespace is valid
 */
function validateNamespacePattern(namespace: string, libName: string): boolean {
    if (!/^[a-zA-Z]/.test(namespace)) {
        throw new Error(t('error.invalidNamespace.mustStartWithLetter'));
    }
    if (/\.$/.test(namespace)) {
        throw new Error(t('error.invalidNamespace.mustEndInPeriod'));
    }
    if (namespace.toUpperCase() === 'SAP') {
        throw new Error(t('error.invalidNamespace.cannotBeSap', { str: namespace }));
    }
    if (namespace.toLowerCase().startsWith('new')) {
        throw new Error(t('error.invalidNamespace.cannotStartWithNew', { str: namespace.substring(0, 3) }));
    }
    if (/\.\d/.test(namespace)) {
        throw new Error(t('error.invalidNamespace.numAfterPeriod'));
    }
    if (!/^[\w\d._]+$/.test(namespace)) {
        throw new Error(t('error.invalidNamespace.specialCharacter'));
    }
    if ((libName + namespace).length > 70) {
        throw new Error(t('error.invalidNamespace.tooLong', { length: 70 }));
    }

    return true;
}

/**
 * Validates the namespace to ensure we do not create malformed libs.
 *
 * @param namespace namespace specified
 * @param libName name for library
 * @throws Error with validation message, if the namespace is not valid
 * @returns true, if app id is validated
 */
export function validateNamespace(namespace: string, libName: string): boolean {
    if (!namespace) {
        throw new Error(t('error.missingRequiredProperty', { propertyName: 'namespace' }));
    }
    return validateNamespacePattern(namespace, libName);
}

/**
 * Validates by throwing if the specified version does not have a coercible semantic version.
 * Currently we have special handling for empty string and undefined otherwise see: https://github.com/npm/node-semver#coercion.
 * Example: 'snapshot-1.2.4' can be coerced to '1.2.4' and so is considered valid.
 *
 * @param version - the UI5 version string to validate
 * @returns - true if the specified UI5 version is considered valid
 */
export function validateUI5Version(version: string | undefined): boolean {
    if (version && semVer.coerce(version) === null) {
        throw new Error(t('error.invalidUI5Version', { version }));
    }
    return true;
}

/**
 * Validates the specified ui5Lib config.
 *
 * @param ui5Lib configuration object given to the generate method conataining everything required to generate a UI5 application
 * @returns true, if the ui5Lib is valid
 * @throws Error with validation message, if the ui5App is not valid
 */
export function validate(ui5Lib: UI5LibConfig): boolean {
    return (
        validateLibName(ui5Lib.libraryName) &&
        validateNamespace(ui5Lib.namespace, ui5Lib.libraryName) &&
        validateUI5Version(ui5Lib.frameworkVersion)
    );
}
