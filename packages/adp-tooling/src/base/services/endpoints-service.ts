import { isAppStudio } from '@sap-ux/btp-utils';
import { Endpoint, checkEndpoints, isExtensionInstalledVsCode } from '@sap-ux/environment-check';

import { SystemDetails } from '../../types';

/**
 * Service class to manage and retrieve information about system endpoints,
 * including their names, authentication requirements, and specific details.
 */
export class EndpointsService {
    public endpoints: Endpoint[];
    private isExtensionInstalled: boolean;

    /**
     * Creates an instance of EndpointsService.
     */
    constructor() {
        this.endpoints = [];
        this.isExtensionInstalled = isExtensionInstalledVsCode('sapse.sap-ux-application-modeler-extension');
    }

    /**
     * Fetches endpoints from a predefined source and stores them in the service.
     *
     * @returns {Promise<void>} A promise that resolves when endpoints have been fetched and stored.
     */
    public async getEndpoints(): Promise<void> {
        const { endpoints } = await checkEndpoints();
        this.endpoints = endpoints;
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

    public shouldGetLocalSystemDetails() {
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
     * @returns {Auth | undefined} Authentication details if the system is found, undefined otherwise.
     */
    public async getSystemDetails(system: string): Promise<SystemDetails | undefined> {
        if (this.endpoints.length === 0) {
            await this.getEndpoints();
        }
        const endpoint = this.endpoints.find((e) => e.Name === system || e.Url === system);

        return endpoint
            ? {
                  client: endpoint.Client || '',
                  url: endpoint.Url || '',
                  authenticationType: endpoint.Authentication
              }
            : undefined;
    }
}
