import semVer from 'semver';
import { t } from '../i18n';
import type { Ui5App } from '../types';

/**
 * Validates the specified app id to ensure we do not create malformed documents.
 *
 * @param appId SAP application id (manifest.json>sap.app>id)
 * @throws Error with validation message, if the app id is not valid
 * @returns true, if app id is validated
 */
export function validateAppId(appId: string): boolean {
    if (!appId) {
        throw new Error(t('error.missingRequiredProperty', { propertyName: 'app.id' }));
    }
    const match = appId.match(/["]/);
    if (match) {
        throw new Error(
            t('error.disallowedCharacters', { propertyName: 'app.id', disallowedChars: `${match?.join()}` })
        );
    }
    return true;
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
 * Validates the specified ui5App.
 *
 * @param ui5App configuration object given to the generate method conataining everything required to generate a UI5 application
 * @returns true, if the ui5App is valid
 * @throws Error with validation message, if the ui5App is not valid
 */
export function validate(ui5App: Ui5App): boolean {
    return (
        validateAppId(ui5App.app.id) &&
        validateUI5Version(ui5App.ui5?.version) &&
        validateUI5Version(ui5App.ui5?.localVersion) &&
        validateUI5Version(ui5App.ui5?.minUI5Version)
    );
}
