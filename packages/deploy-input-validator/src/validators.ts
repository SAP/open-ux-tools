import { t } from './i18n';

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
        errorMessages.push(t('PROMPT_ABAP_APPNAME_REQUIRED'));
    } else if (name.split('/').length - 1 >= 3) {
        errorMessages.push(t('PROMPT_ABAP_INVALID_NAMESPACE'));
    } else if (name.match(/^\/.*\/\w*$/g)) {
        const splitNames = name.split('/');
        let errMsg;
        if (splitNames[1].length > 10) {
            errMsg = t('PROMPT_ABAP_INVALID_NAMESPACE_LENGTH', { length: splitNames[1].length });
        }
        if (splitNames[2].length > 15) {
            errMsg = `${errMsg ? errMsg + ', ' : ''}${t('PROMPT_ABAP_INVALID_APPNAME_LENGTH', {
                length: splitNames[2].length
            })}`;
        }
        if (errMsg) {
            errorMessages.push(errMsg);
        }
    } else if (length > 15) {
        errorMessages.push(t('PROMPT_ABAP_INVALID_APPNAME_LENGTH', { length }));
    }

    if (length) {
        if (prefix && !name.toUpperCase().startsWith(prefix.toUpperCase())) {
            errorMessages.push(t('PROMPT_ABAP_INVALID_APPNAME', { prefix }));
        }
        if (!name.match(/^[A-Za-z0-9_/]*$/)) {
            errorMessages.push(t('ERROR_CHARACTERS_FORBIDDEN_IN_APP_NAME'));
        }
    }

    if (errorMessages.length === 0) {
        return true;
    } else {
        return errorMessages.join('\n') + (errorMessages.length > 1 ? '\n' : '');
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
        return t('PROMPT_ABAP_APPDESC_LENGTH');
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
    const c = client?.trim() || '';

    const isValid = c === '' || !!c.match(/^[0-9]{3}$/);

    if (isValid) {
        return true;
    } else {
        return t('ERROR_INVALID_CLIENT', { client });
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
        return t('PROMPT_ABAP_TRANSPORT_NO_REQUIRED');
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
        return t('PROMPT_ABAP_PACKAGE_WARN');
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
        return t('ERROR_INVALID_URL', { input });
    }
}
