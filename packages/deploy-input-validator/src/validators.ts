import { t } from './i18n';
import { EOL } from 'os';

/**
 * Validator Fiori app name is compatbiel with Fiori project requirements.
 *
 * @param name Fiori app name
 * @param prefix Prefix required by backend system
 * @returns True or error message
 */
export function validateAppName(name: string, prefix?: string): boolean | string {
    const errorMessages: string[] = [];

    const length = name ? name.trim().length : 0;
    if (!length) {
        errorMessages.push(t('AbapAppNameRequired'));
    } else if (name.split('/').length - 1 >= 3) {
        errorMessages.push(t('AbapInvalidNamespace'));
    } else if (/^\/.*\/\w*$/g.test(name)) {
        const splitNames = name.split('/');
        let errMsg;
        if (splitNames[1].length > 10) {
            errMsg = t('AbapInvalidNamespaceLength', { length: splitNames[1].length });
        }
        if (splitNames[2].length > 15) {
            errMsg = `${errMsg ? errMsg + ', ' : ''}${t('AbapInvalidAppNameLength', {
                length: splitNames[2].length
            })}`;
        }
        if (errMsg) {
            errorMessages.push(errMsg);
        }
    } else if (length > 15) {
        errorMessages.push(t('AbapInvalidAppNameLength', { length }));
    }

    if (length) {
        if (prefix && !name.toUpperCase().startsWith(prefix.toUpperCase())) {
            errorMessages.push(t('AbapInvalidAppName', { prefix }));
        }
        if (!name.match(/^[A-Za-z0-9_/]*$/)) {
            errorMessages.push(t('CharactersForbiddenInAppName'));
        }
    }

    if (errorMessages.length === 0) {
        return true;
    } else if (errorMessages.length === 1) {
        return errorMessages[0];
    } else {
        return `${t('InvalidAppNameMultipleReason')}${EOL}${errorMessages.join(EOL)}${EOL}`;
    }
}

/**
 * Validate Fiori app description length is not exceeding 60 characters.
 *
 * @param description Fiori app description
 * @returns true or error message
 */
export function validateAppDescription(description: string): boolean | string {
    if (description.length > 60) {
        return t('AbapAppDescLength');
    } else {
        return true;
    }
}

/**
 * Client number is either empty or 3 digit string.
 *
 * @param client ABAP system client number
 * @returns true or error message
 */
export function validateClient(client: string): boolean | string {
    const formattedInput = client?.trim() || '';

    const isValid = formattedInput === '' || !!/^[\d]{3}$/.test(formattedInput);

    if (isValid) {
        return true;
    } else {
        return t('InvalidClient', { client });
    }
}

/**
 * Transport request number is not required for local package.
 *
 * @param transportRequest Transport request number
 * @param packageName Package name
 * @returns true or error message
 */
export function validateTransportRequestNumber(transportRequest: string, packageName: string): boolean | string {
    const regex = /^[$LlTt]/;

    if (regex.test(packageName) && transportRequest?.trim()) {
        return t('AbapTransportNumRequired');
    } else {
        return true;
    }
}

/**
 * Validate package name cannot be empty.
 *
 * @param input Package name
 * @returns true or error message
 */
export function validatePackage(input: string): boolean | string {
    if (!input?.trim()) {
        return t('AbapPackageWarn');
    } else {
        return true;
    }
}

/**
 * Validate url input is valid url format.
 *
 * @param input Backend ABAP system url
 * @returns true or error message
 */
export function validateUrl(input: string): boolean | string {
    try {
        const url = new URL(input);
        return !!url.protocol && !!url.host;
    } catch {
        return t('InvalidUrl', { input });
    }
}
