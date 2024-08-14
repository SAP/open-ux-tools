import type { ToolsLogger } from '@sap-ux/logger';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getCredentialsFromStore } from '@sap-ux/system-access';
import type { Endpoint } from '@sap-ux/environment-check';
import { checkEndpoints, isExtensionInstalledVsCode } from '@sap-ux/environment-check';

import type { SystemDetails } from '../../types';

/**
 * Service class to manage and retrieve information about system endpoints,
 * including their names, authentication requirements, and specific details.
 */
export class EndpointsService {
    private endpoints: Endpoint[];
    private isExtensionInstalled: boolean;

    /**
     * Creates an instance of EndpointsService.
     *
     * @param {ToolsLogger} logger - The logger.
     */
    constructor(private logger: ToolsLogger) {
        this.endpoints = [];
        this.isExtensionInstalled = isExtensionInstalledVsCode('sapse.sap-ux-application-modeler-extension');
    }

    /**
     * Fetches endpoints from a predefined source and stores them in the service.
     *
     * @returns {Promise<void>} A promise that resolves when endpoints have been fetched and stored.
     */
    public async getEndpoints(): Promise<Endpoint[] | undefined> {
        try {
            const { endpoints } = await checkEndpoints();
            this.endpoints = endpoints;
            return endpoints;
        } catch (e) {
            this.logger?.error(`Failed to fetch endpoints list. Reason: ${e.message}`);
            throw new Error(e.message);
        }
    }

    /**
     * Retrieves the names of all stored endpoints and sorted alphabetically.
     *
     * @returns {string[]} An array of endpoint names and sorted order.
     */
    public getEndpointNames(): string[] {
        return this.endpoints
            .map((endpoint) => endpoint.Name)
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' }));
    }

    /**
     * Determines whether local system details should be retrieved based on the environment and installation status.
     *
     * @returns {boolean} True if the application is running in VS Code native and the extension is installed,
     *                    indicating that it's appropriate to fetch local system details; otherwise, false.
     */
    public shouldGetLocalSystemDetails(): boolean {
        return !isAppStudio() && this.isExtensionInstalled;
    }

    /**
     * Determines if authentication is not required for accessing a specified system.
     *
     * @param {string} system - The name of the system to check.
     * @returns {boolean} True if no authentication is required, false otherwise.
     */
    private getDestinationRequiresAuth(system: string): boolean {
        const found = this.endpoints.find((endpoint: Endpoint) => endpoint.Name === system);

        return found?.Authentication === 'NoAuthentication';
    }

    /**
     * Checks if a specified system requires authentication based on the endpoint information and installation status.
     *
     * @param {string} system - The name of the system to check.
     * @returns {boolean} True if the system requires authentication, false otherwise.
     */
    private getSystemRequiresAuthentication(system: string): boolean {
        if (!this.isExtensionInstalled || this.endpoints.length === 0) {
            return true;
        }

        return !(
            this.endpoints.filter((endpoint) => endpoint.Url === system).length > 0 ||
            this.endpoints.filter((endpoint) => endpoint.Name === system).length > 0
        );
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
            ? this.getDestinationRequiresAuth(systemName)
            : this.getSystemRequiresAuthentication(systemName);
    }

    /**
     * Retrieves authentication details for a specified system if available.
     *
     * @param {string} system - The name or URL of the system to find.
     * @returns {SystemDetails | undefined} Authentication details if the system is found, undefined otherwise.
     */
    public async getSystemDetails(system: string): Promise<SystemDetails | undefined> {
        if (this.endpoints.length === 0) {
            await this.getEndpoints();
        }

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
