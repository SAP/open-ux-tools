import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Endpoint } from '@sap-ux/environment-check';
import { getCredentialsFromStore } from '@sap-ux/system-access';
import { checkEndpoints, isExtensionInstalledVsCode } from '@sap-ux/environment-check';

import type { SystemDetails } from '../types';

/**
 * Determines if authentication is not required for accessing a specified system.
 *
 * @param {string} system - The name of the system to check.
 * @param {Endpoint[]} endpoints Array of system endpoints.
 * @returns {boolean} True if no authentication is required, false otherwise.
 */
function getDestinationRequiresAuth(system: string, endpoints: Endpoint[]): boolean {
    const found = endpoints.find((endpoint: Endpoint) => endpoint.Name === system);

    return found?.Authentication === 'NoAuthentication';
}

/**
 * Checks if a specified system requires authentication based on the endpoint information and installation status.
 *
 * @param {string} system - The name of the system to check.
 * @param {Endpoint[]} endpoints Array of system endpoints.
 * @returns {boolean} True if the system requires authentication, false otherwise.
 */
function getSystemRequiresAuthentication(system: string, endpoints: Endpoint[]): boolean {
    const isInstalled = isExtensionInstalledVsCode('sapse.sap-ux-application-modeler-extension');
    if (!isInstalled || endpoints.length === 0) {
        return true;
    }

    return !(
        endpoints.filter((endpoint) => endpoint.Url === system).length > 0 ||
        endpoints.filter((endpoint) => endpoint.Name === system).length > 0
    );
}

/**
 * Retrieves the names of all stored endpoints and sorted alphabetically.
 *
 * @param {Endpoint[]} endpoints Array of system endpoints.
 * @returns {string[]} An array of endpoint names and sorted order.
 */
export function getEndpointNames(endpoints: Endpoint[]): string[] {
    return endpoints
        .map((endpoint) => endpoint.Name)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' }));
}

/**
 * Service class to manage and retrieve information about system endpoints,
 * including their names, authentication requirements, and specific details.
 */
export class EndpointsManager {
    private static instance: EndpointsManager;
    private endpoints: Endpoint[];

    /**
     * Creates an instance of EndpointsManager.
     *
     * @param {ToolsLogger} logger - The logger.
     */
    private constructor(private logger: ToolsLogger) {
        this.endpoints = [];
    }

    /**
     * Creates an instance of EndpointsManager.
     *
     * @param {ToolsLogger} logger - The logger.
     * @returns {EndpointsManager} instance of endpoints manager
     */
    static async getInstance(logger: ToolsLogger): Promise<EndpointsManager> {
        if (!this.instance) {
            this.instance = new EndpointsManager(logger);
            await this.instance.loadEndpoints();
        }

        return this.instance;
    }

    /**
     * Fetches endpoints from a predefined source and stores them in the service.
     *
     * @returns {Endpoint[]} Array of system endpoints.
     */
    public getEndpoints(): Endpoint[] {
        return this.endpoints;
    }

    /**
     * Checks if there are set endpoints.
     *
     * @returns {boolean} true if there are set endpoints otherwise false.
     */
    public hasEndpoints(): boolean {
        return this.endpoints.length > 0;
    }

    /**
     * Fetches endpoints from a predefined source and stores them in the service.
     *
     * @returns {Promise<void>} A promise that resolves when endpoints are fetched and stored.
     */
    private async loadEndpoints(): Promise<void> {
        try {
            const { endpoints } = await checkEndpoints();
            this.endpoints = endpoints;
        } catch (e) {
            this.logger?.error(`Failed to fetch endpoints list. Reason: ${e.message}`);
            throw new Error(e.message);
        }
    }

    /**
     * Determines whether local system details should be retrieved based on the environment and installation status.
     *
     * @returns {boolean} True if the application is running in VS Code native and there are set systems,
     *                    indicating that it's appropriate to fetch local system details; otherwise, false.
     */
    public shouldGetLocalSystemDetails(): boolean {
        return !isAppStudio() && !this.hasEndpoints();
    }

    /**
     * Retrieves destination info by name.
     *
     * @param {string} system - The name of the system to check.
     * @returns {Endpoint | undefined} The destination info for the specific system.
     */
    public getDestinationInfoByName(system: string): Endpoint | undefined {
        return this.endpoints.find((endpoint: Endpoint) => endpoint.Name === system);
    }

    /**
     * Determines whether a system requires authentication based on the environment of the application.
     *
     * @param {string} systemName The name of the system to check.
     * @returns {boolean} True if the system requires authentication, false otherwise.
     */
    public getSystemRequiresAuth(systemName: string): boolean {
        return isAppStudio()
            ? getDestinationRequiresAuth(systemName, this.endpoints)
            : getSystemRequiresAuthentication(systemName, this.endpoints);
    }

    /**
     * Retrieves authentication details for a specified system if available.
     *
     * @param {string} system - The name or URL of the system to find.
     * @returns {SystemDetails | undefined} Authentication details if the system is found, undefined otherwise.
     */
    public async getSystemDetails(system: string): Promise<SystemDetails | undefined> {
        const endpoint = this.endpoints.find((e) => e.Name === system || e.Url === system);

        if (!endpoint) {
            this.logger.warn(`No endpoint found for system: ${system}`);
            return undefined;
        }

        const details: SystemDetails = {
            client: endpoint.Client ?? '',
            url: endpoint.Url ?? ''
        };

        try {
            const storedSystem = await getCredentialsFromStore(
                { url: details.url, client: details.client },
                this.logger
            );

            if (storedSystem) {
                details.authenticationType = storedSystem.authenticationType;
                details.username = storedSystem.username;
                details.password = storedSystem.password;
            }
        } catch (e) {
            this.logger.error(`Error fetching credentials from store for system: ${system}`);
            this.logger.debug(e.message);
            return undefined;
        }

        return details;
    }
}
