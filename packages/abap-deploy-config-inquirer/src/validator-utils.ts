import { t } from './i18n';
import { PromptState } from './prompts/prompt-state';
import {
    createTransportNumberFromService,
    getTransportListFromService,
    listPackagesFromService
} from './service-provider-utils';
import type { BackendTarget, SystemConfig, TransportListItem } from './types';

/**
 * Checks if the input is an empty string.
 *
 * @param urlString - input string
 * @returns boolean
 */
export function isEmptyString(urlString: string): boolean {
    return !urlString || !/\S/.test(urlString);
}

/**
 * Determines if the input is a valid URL.
 *
 * @param input - input string
 * @returns boolean
 */
export function isValidUrl(input: string): boolean {
    try {
        const url = new URL(input);
        return !!url.protocol && !!url.host;
    } catch {
        return false;
    }
}

/**
 * Returns true if the input is valid for the client. If the input is empty, it is considered valid.
 *
 * @param client - client string input
 * @returns boolean
 */
export function isValidClient(client: string): boolean {
    const regex = /^\d{3}$/;
    return !!regex.exec(client);
}

/**
 * Returns the list of packages for the given input.
 *
 * @param input - input string
 * @param systemConfig - system configuration
 * @param backendTarget - backend target from abap deploy config prompt options
 * @returns list of packages
 */
export async function listPackages(
    input: string,
    systemConfig: SystemConfig,
    backendTarget?: BackendTarget
): Promise<string[]> {
    if (!systemConfig.url && !systemConfig.destination) {
        return [];
    }

    return listPackagesFromService(input, backendTarget);
}

/**
 * Temporary duplication of `validateAppName` from `@sap-ux/project-input-validator` until i18n loading issue is resolved.
 * Validator Fiori app name is compatible with Fiori project requirements.
 *
 * @param name Fiori app name
 * @param prefix Prefix required by backend system
 * @returns True or error message
 */
function validateAppName(name: string, prefix?: string): boolean | string {
    const length = name ? name.trim().length : 0;
    if (!length) {
        return t('errors.validators.appNameRequired');
    }

    if (name.split('/').length > 3) {
        return t('errors.validators.abapInvalidNamespace');
    } else if (/^\/.*\/\w*$/g.test(name)) {
        const splitNames = name.split('/');
        let accumulatedMsg = '';
        if (splitNames[1].length > 10) {
            const errMsg = t('errors.validators.abapInvalidNamespaceLength', { length: splitNames[1].length });
            accumulatedMsg += `${errMsg}, `;
        }
        if (splitNames[2].length > 15) {
            const errMsg = t('errors.validators.abapInvalidAppNameLength', { length: splitNames[2].length });
            accumulatedMsg += `${errMsg}, `;
        }
        if (accumulatedMsg) {
            accumulatedMsg = accumulatedMsg.substring(0, accumulatedMsg.length - 2);
            return accumulatedMsg;
        }
    } else if (length > 15) {
        return t('errors.validators.abapInvalidAppNameLength', { length });
    }

    if (prefix && !name.toUpperCase().startsWith(prefix.toUpperCase())) {
        return t('errors.validators.abapInvalidAppName', { prefix });
    }
    if (!/^[A-Za-z0-9_/]*$/.test(name)) {
        return t('errors.validators.charactersForbiddenInAppName');
    }

    return true;
}

/**
 * Determines if the app name is valid.
 *
 * @param name - name provided for the app
 * @returns valid: boolean, errorMessage: string | undefined
 */
export function isAppNameValid(name: string): { valid: boolean; errorMessage: string | undefined } | undefined {
    const prefix = PromptState.transportAnswers.transportConfig?.getApplicationPrefix();
    const appValidation = validateAppName(name, prefix);

    let result;
    if (appValidation === true) {
        result = {
            valid: true,
            errorMessage: undefined
        };
    }

    if (typeof appValidation === 'string') {
        result = {
            valid: false,
            errorMessage: appValidation
        };
    }
    return result;
}

/**
 * Returns the list of transport numbers.
 *
 * @param packageName - package name
 * @param appName - app name
 * @param systemConfig - system configuration
 * @param backendTarget - backend target
 * @returns list of transport numbers
 */
export async function getTransportList(
    packageName: string,
    appName: string,
    systemConfig: SystemConfig,
    backendTarget?: BackendTarget
): Promise<TransportListItem[] | undefined> {
    if (!systemConfig.url && !systemConfig.destination) {
        return undefined;
    }

    const transportList = await getTransportListFromService(packageName, appName, backendTarget);
    return transportList?.length === 1 && transportList[0].transportReqNumber === '' ? [] : transportList;
}

/**
 * Create a transport number from the service.
 *
 * @param createTransportParams - input parameters for creating a new transport request for an UI5 app object
 * @param createTransportParams.packageName - package name
 * @param createTransportParams.ui5AppName - UI5 app name
 * @param createTransportParams.description - transport request description
 * @param systemConfig - system configuration
 * @param backendTarget - backend target
 * @returns transport number if created successfully, otherwise undefined
 */
export async function createTransportNumber(
    createTransportParams: {
        packageName: string;
        ui5AppName: string;
        description: string;
    },
    systemConfig: SystemConfig,
    backendTarget?: BackendTarget
): Promise<string | undefined> {
    if (!systemConfig.url && !systemConfig.destination) {
        return undefined;
    }
    return createTransportNumberFromService(createTransportParams, backendTarget);
}
