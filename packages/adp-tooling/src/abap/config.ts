import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapTarget } from '@sap-ux/ui5-config';
import type { AuthenticationType } from '@sap-ux/store';
import type { AxiosRequestConfig, ProviderConfiguration } from '@sap-ux/axios-extension';

import { SystemLookup } from '../source';

export type RequestOptions = AxiosRequestConfig & Partial<ProviderConfiguration>;

/**
 * Determines the ABAP target configuration based on the running environment and system details.
 *
 * For an App Studio environment, the config is constructed with a destination property.
 * For non-AppStudio environments, the function retrieves system details from the SystemLookup service,
 * maps these details to an AbapTarget, and attaches authentication credentials to the request options if available.
 *
 * @param {string} system - The system identifier (URL or system name).
 * @param {ToolsLogger} logger - The logger for logging errors.
 * @param {RequestOptions} [requestOptions] - Optional request options which will be updated with auth information if available.
 * @param {string} [client] - Optional client number for systems with multiple clients.
 * @returns {Promise<AbapTarget>} A promise that resolves to the configured ABAP configuration.
 */
export async function getProviderConfig(
    system: string,
    logger: ToolsLogger,
    requestOptions?: RequestOptions,
    client?: string
): Promise<AbapTarget> {
    let config: AbapTarget;

    if (isAppStudio()) {
        config = {
            destination: system
        };
    } else {
        const systemLookup = new SystemLookup(logger);
        const details = await systemLookup.getSystemByName(system);

        if (!details) {
            throw new Error(`No system details found for system: ${system}`);
        }

        config = {
            client: details?.Client ?? client,
            url: details?.Url
        } as AbapTarget;

        if (details?.Authentication) {
            config.authenticationType = details?.Authentication as AuthenticationType;
        }

        const username = details?.Credentials?.username;
        const password = details?.Credentials?.password;
        if (requestOptions && username && password) {
            requestOptions.auth = {
                username,
                password
            };
        }
    }

    return config;
}
