import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapTarget } from '@sap-ux/ui5-config';
import type { AuthenticationType } from '@sap-ux/store';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider, AxiosRequestConfig, ProviderConfiguration } from '@sap-ux/axios-extension';

import { TargetSystems } from './target-systems';

export type RequestOptions = AxiosRequestConfig & Partial<ProviderConfiguration>;

interface ProviderOptions {
    system: string;
    client?: string;
    username?: string;
    password?: string;
}

/**
 * Retrieves a fully configured ABAP service provider for the specified system.
 *
 * This function uses the provided system identifier (and optional client and credentials)
 * to build an ABAP target configuration, which is then passed to createAbapServiceProvider.
 *
 * @param {ProviderOptions} options - Options for configuring the provider.
 * @param {ToolsLogger} logger - The logger for logging errors and debug messages.
 * @returns {Promise<AbapServiceProvider>} A promise that resolves to the configured ABAP service provider.
 * @throws {Error} If provider instantiation fails.
 */
export async function getConfiguredProvider(
    { system, client, password, username }: ProviderOptions,
    logger: ToolsLogger
): Promise<AbapServiceProvider> {
    try {
        const requestOptions: RequestOptions = {
            ignoreCertErrors: false
        };

        const target = await getAbapTarget(system, logger, requestOptions, client);

        if (username && password) {
            requestOptions.auth = { username, password };
        }

        return await createAbapServiceProvider(target, requestOptions, false, logger);
    } catch (e) {
        logger?.error(`Failed to instantiate provider for system: ${system}. Reason: ${e.message}`);
        throw new Error(e.message);
    }
}

/**
 * Determines the ABAP target configuration based on the running environment and system details.
 *
 * For an App Studio environment, the target is constructed with a destination property.
 * For non-AppStudio environments, the function retrieves system details from the TargetSystems service,
 * maps these details to an AbapTarget, and attaches authentication credentials to the request options if available.
 *
 * @param {string} system - The system identifier (URL or system name).
 * @param {ToolsLogger} logger - The logger for logging errors.
 * @param {RequestOptions} [requestOptions] - Optional request options which will be updated with auth information if available.
 * @param {string} [client] - Optional client number for systems with multiple clients.
 * @returns {Promise<AbapTarget>} A promise that resolves to the configured ABAP target.
 */
export async function getAbapTarget(
    system: string,
    logger: ToolsLogger,
    requestOptions?: RequestOptions,
    client?: string
): Promise<AbapTarget> {
    let target: AbapTarget;

    const targetSystems = new TargetSystems(logger);

    if (isAppStudio()) {
        target = {
            destination: system
        };
    } else {
        const details = await targetSystems.getSystemByName(system);

        if (!details) {
            throw new Error(`No system details found for system: ${system}`);
        }

        target = {
            client: details?.Client ?? client,
            url: details?.Url
        } as AbapTarget;

        if (details?.Authentication) {
            target.authenticationType = details?.Authentication as AuthenticationType;
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

    return target;
}
