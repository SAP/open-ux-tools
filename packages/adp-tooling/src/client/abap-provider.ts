import { isAppStudio } from '@sap-ux/btp-utils';
import type { AbapTarget } from '@sap-ux/ui5-config';
import type { AuthenticationType } from '@sap-ux/store';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider, AxiosRequestConfig, ProviderConfiguration } from '@sap-ux/axios-extension';

import type { TargetSystems } from './target-systems';

export type RequestOptions = AxiosRequestConfig & Partial<ProviderConfiguration>;

/**
 * Service for managing and providing access to an ABAP service provider.
 */
export class AbapProvider {
    private provider: AbapServiceProvider;
    private system: string | undefined;

    /**
     * Constructs an instance of AbapProvider.
     *
     * @param {TargetSystems} targetSystems - The endpoints service for retrieving system details.
     * @param {ToolsLogger} [logger] - The logger.
     */
    constructor(private readonly targetSystems: TargetSystems, private readonly logger?: ToolsLogger) {}

    /**
     * Retrieves the configured ABAP service provider if set, otherwise throws an error.
     *
     * @returns {AbapServiceProvider} - The configured ABAP service provider.
     */
    public getProvider(): AbapServiceProvider {
        if (!this.provider) {
            throw new Error('Provider was not set!');
        }
        return this.provider;
    }

    /**
     * Retrieves ABAP service provider connected ABAP system.
     *
     * @returns {string | undefined} - the connected system.
     */
    public getSystem(): string | undefined {
        return this.system;
    }

    /**
     * Configures the ABAP service provider using the specified system details and credentials.
     *
     * @param {string} system - The system identifier.
     * @param {string} [client] - The client, if applicable.
     * @param {string} [username] - The username for authentication.
     * @param {string} [password] - The password for authentication.
     */
    public async setProvider(system: string, client?: string, username?: string, password?: string): Promise<void> {
        try {
            const requestOptions: RequestOptions = {
                ignoreCertErrors: false
            };

            const target = await this.determineTarget(system, requestOptions, client);

            if (username && password) {
                requestOptions.auth = { username, password };
            }

            this.provider = await createAbapServiceProvider(target, requestOptions, false, {} as Logger);
            this.system = system;
        } catch (e) {
            this.logger?.error(`Failed to instantiate provider for system: ${system}. Reason: ${e.message}`);
            throw new Error(e.message);
        }
    }

    /**
     * Determines the target configuration for the ABAP service provider based on whether the application
     * is running within SAP App Studio or outside of it.
     *
     * @param {string} system - The system identifier, which could be a URL or a system name.
     * @param {RequestOptions} requestOptions - The request options to be configured during this setup.
     * @param {string} [client] - Optional client number, used in systems where multiple clients exist.
     * @returns {Promise<AbapTarget>} - The configuration object for the ABAP service provider, tailored based on the running environment.
     */
    public async determineTarget(system: string, requestOptions: RequestOptions, client?: string): Promise<AbapTarget> {
        let target: AbapTarget;

        if (isAppStudio()) {
            target = {
                destination: system
            };
        } else {
            const details = await this.targetSystems.getSystemByName(system);

            target = {
                client: details?.Client ?? client,
                url: details?.Url
            } as AbapTarget;

            if (details?.Authentication) {
                target.authenticationType = details?.Authentication as AuthenticationType;
            }

            const username = details?.Credentials?.username;
            const password = details?.Credentials?.password;
            if (username && password) {
                requestOptions.auth = {
                    username,
                    password
                };
            }
        }

        return target;
    }
}
