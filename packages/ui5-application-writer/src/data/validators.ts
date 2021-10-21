import { Ui5App } from '../types';

/**
 * Validates the specified app id to ensure we do not create malformed documents.
 *
 * @param appId
 * @throws Error with validation message, if the app id is not valid
 * @returns true, if app id is validated
 */
export function validateAppId(appId: string): boolean {
    if (!appId) {
        throw new Error('The property: app.id must have a value'); // todo: add localised parameterised message
    }
    const match = appId.match(/["]/);
    if (match) {
        throw new Error(`The property: appId.id contains disallowed characters: ${match?.join()}`); // todo: Add localised message
    }
    return true;
}

/**
 * Validates the specified ui5App.
 *
 * @param ui5App
 * @returns true, if the ui5App is valid
 * @throws Error with validation message, if the ui5App is not valid
 */
export function validate(ui5App: Ui5App): boolean {
    return validateAppId(ui5App.app.id);
}
