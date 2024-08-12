import { PromptState } from './prompts/prompt-state';
import {
    createTransportNumberFromService,
    getTransportListFromService,
    listPackagesFromService
} from './service-provider-utils';
import { validateAppName } from '@sap-ux/project-input-validator';
import type { AbapDeployConfigPromptOptions, SystemConfig, TransportListItem } from './types';

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
 * Returns true if the input does not exist, or if it exists but it is invalid.
 *
 * @param client - input string
 * @returns boolean
 */
export function clientDoesNotExistOrInvalid(client?: string): boolean {
    return Boolean(!client || (client && !isValidClient(client)));
}

/**
 * Returns the list of packages for the given input.
 *
 * @param input - input string
 * @param options - aba deploy config prompt options
 * @param systemConfig - system configuration
 * @returns list of packages
 */
export async function listPackages(
    input: string,
    options: AbapDeployConfigPromptOptions,
    systemConfig: SystemConfig
): Promise<string[]> {
    if (!systemConfig.url && !systemConfig.destination) {
        return [];
    }

    return listPackagesFromService(input, options, systemConfig);
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
 * @param options - abap deploy config prompt options
 * @param systemConfig - system configuration
 * @returns list of transport numbers
 */
export async function getTransportList(
    packageName: string,
    appName: string,
    options: AbapDeployConfigPromptOptions,
    systemConfig: SystemConfig
): Promise<TransportListItem[] | undefined> {
    if (!systemConfig.url && !systemConfig.destination) {
        return undefined;
    }

    const transportList = await getTransportListFromService(packageName, appName, options, systemConfig);
    return transportList?.length === 1 && transportList[0].transportReqNumber === '' ? [] : transportList;
}

/**
 * Create a transport number from the service.
 *
 * @param createTransportParams - input parameters for creating a new transport request for an UI5 app object
 * @param createTransportParams.packageName - package name
 * @param createTransportParams.ui5AppName - UI5 app name
 * @param createTransportParams.description - transport request description
 * @param options - abap deploy config prompt options
 * @param systemConfig - system configuration
 * @returns transport number if created successfully, otherwise undefined
 */
export async function createTransportNumber(
    createTransportParams: {
        packageName: string;
        ui5AppName: string;
        description: string;
    },
    options: AbapDeployConfigPromptOptions,
    systemConfig: SystemConfig
): Promise<string | undefined> {
    if (!systemConfig.url && !systemConfig.destination) {
        return undefined;
    }

    return createTransportNumberFromService(createTransportParams, options, systemConfig);
}
