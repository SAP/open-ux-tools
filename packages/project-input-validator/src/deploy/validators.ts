import { t } from '../i18n';
import { EOL } from 'os';

/**
 * Validator Fiori app name is compatble with Fiori project requirements.
 *
 * @param name Fiori app name
 * @param prefix Prefix required by backend system
 * @returns True or error message
 */
export function validateAppName(name: string, prefix?: string): boolean | string {
    const errorMessages: string[] = [];

    const length = name ? name.trim().length : 0;
    if (!length) {
        return t('deploy.abapAppNameRequired');
    }

    if (name.split('/').length > 3) {
        errorMessages.push(t('deploy.abapInvalidNamespace'));
    } else if (/^\/.*\/\w*$/g.test(name)) {
        const splitNames = name.split('/');
        let accumulatedMsg = '';
        if (splitNames[1].length > 10) {
            const errMsg = t('deploy.abapInvalidNamespaceLength', { length: splitNames[1].length });
            accumulatedMsg += `${errMsg}, `;
        }
        if (splitNames[2].length > 15) {
            const errMsg = t('deploy.abapInvalidAppNameLength', { length: splitNames[2].length });
            accumulatedMsg += `${errMsg}, `;
        }
        if (accumulatedMsg) {
            accumulatedMsg = accumulatedMsg.substring(0, accumulatedMsg.length - 2);
            errorMessages.push(accumulatedMsg);
        }
    } else if (length > 15) {
        errorMessages.push(t('deploy.abapInvalidAppNameLength', { length }));
    }

    if (prefix && !name.toUpperCase().startsWith(prefix.toUpperCase())) {
        errorMessages.push(t('deploy.abapInvalidAppName', { prefix }));
    }
    if (!/^[A-Za-z0-9_/]*$/.test(name)) {
        errorMessages.push(t('deploy.charactersForbiddenInAppName'));
    }

    return processErrorMessages(errorMessages);
}

/**
 * Helper function to format an array of error messages to a single string.
 *
 * @param errorMessages Array of error messages
 * @returns Returns true or formatted error message string
 */
function processErrorMessages(errorMessages: string[]): boolean | string {
    if (errorMessages.length === 0) {
        return true;
    } else if (errorMessages.length === 1) {
        return errorMessages[0];
    } else {
        const indentErrorMessageRows = errorMessages.map((errorMessage) => `${' '.repeat(8)}${errorMessage}`).join(EOL);
        return `${t('deploy.invalidAppNameMultipleReason')}${EOL}${indentErrorMessageRows}${EOL}`;
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
        return t('deploy.abapAppDescLength');
    } else {
        return true;
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

    if (!regex.test(packageName) && !transportRequest?.trim()) {
        return t('deploy.abapTransportNumRequired');
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
        return t('deploy.abapPackageWarn');
    } else {
        return true;
    }
}

