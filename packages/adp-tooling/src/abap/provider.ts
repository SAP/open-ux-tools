import type { ToolsLogger } from '@sap-ux/logger';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { type RequestOptions, getProviderConfig } from './config';

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

        const config = await getProviderConfig(system, logger, requestOptions, client);

        if (username && password) {
            requestOptions.auth = { username, password };
        }

        return await createAbapServiceProvider(config, requestOptions, false, logger);
    } catch (e) {
        logger?.error(`Failed to instantiate provider for system: ${system}. Reason: ${e.message}`);
        throw new Error(e.message);
    }
}
