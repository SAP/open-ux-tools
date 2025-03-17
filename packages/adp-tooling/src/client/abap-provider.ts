import { isAppStudio } from '@sap-ux/btp-utils';
import type { AbapTarget } from '@sap-ux/ui5-config';
import type { Logger, ToolsLogger } from '@sap-ux/logger';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider, AxiosRequestConfig, ProviderConfiguration } from '@sap-ux/axios-extension';

import { EndpointsManager } from '../common';

export type RequestOptions = AxiosRequestConfig & Partial<ProviderConfiguration>;

/**
 * Static service for managing and providing access to an ABAP service provider.
 * This version uses the EndpointsManager singleton instance.
 */
export class AbapProvider {
    private static provider: AbapServiceProvider;
    private static connected = false;
    private static system: string | undefined;
    private static systemRequiresAuthentication: boolean | undefined;

    private static logger?: ToolsLogger;

    /**
     * Initializes the provider with required dependencies.
     * This method fetches the EndpointsManager singleton instance.
     *
     * @param logger - The logger.
     */
    public static async init(logger: ToolsLogger): Promise<void> {
        this.logger = logger;
    }

    /**
     * Retrieves the configured ABAP service provider if set, otherwise throws an error.
     *
     * @returns The configured ABAP service provider.
     */
    public static getProvider(): AbapServiceProvider {
        if (!this.provider) {
            throw new Error('Provider was not set!');
        }
        return this.provider;
    }

    /**
     * Indicates whether the ABAP service provider is connected to an ABAP system.
     *
     * @returns True if connected; otherwise, false.
     */
    public static isConnected(): boolean {
        return this.connected;
    }

    public static get systemRequiresAuth(): boolean {
        return !!this.systemRequiresAuthentication;
    }

    /**
     * Retrieves the connected system identifier.
     *
     * @returns The connected system, or undefined if not connected.
     */
    public static getSystem(): string | undefined {
        return this.system;
    }

    /**
     * Configures the ABAP service provider using the specified system details and credentials.
     *
     * @param system - The system identifier.
     * @param client - The client, if applicable.
     * @param username - The username for authentication.
     * @param password - The password for authentication.
     */
    public static async setProvider(
        system: string,
        client?: string,
        username?: string,
        password?: string
    ): Promise<void> {
        try {
            const requestOptions: RequestOptions = {
                ignoreCertErrors: false
            };

            console.log('setting provider')

            const target = await this.determineTarget(requestOptions, system, client);

            if (username && password) {
                requestOptions.auth = { username, password };
            }

            this.provider = await createAbapServiceProvider(target, requestOptions, false, {} as Logger);

            this.systemRequiresAuthentication = EndpointsManager.getSystemRequiresAuth(system);

            this.connected = true;
            this.system = system;
        } catch (e: any) {
            this.logger?.error(`Failed to instantiate provider for system: ${system}. Reason: ${e.message}`);
            throw new Error(e.message);
        }
    }

    /**
     * Determines the target configuration for the ABAP service provider based on whether the application
     * is running within SAP App Studio or outside of it.
     *
     * @param requestOptions - The request options to be configured during this setup.
     * @param system - The system identifier.
     * @param client - Optional client number.
     * @returns The configuration object for the ABAP service provider.
     */
    private static async determineTarget(
        requestOptions: RequestOptions,
        system: string,
        client?: string
    ): Promise<AbapTarget> {
        let target: AbapTarget;

        if (isAppStudio()) {
            target = { destination: system };
        } else {
            const details = await EndpointsManager.getSystemDetails(system);
            target = {
                ...details,
                client: details?.client ?? client
            } as AbapTarget;

            if (details?.username && details?.password) {
                requestOptions.auth = { username: details.username, password: details.password };
            }
        }

        return target;
    }
}
