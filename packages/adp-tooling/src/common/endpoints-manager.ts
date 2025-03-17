import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Endpoint } from '@sap-ux/environment-check';
import { getCredentialsFromStore } from '@sap-ux/system-access';
import { checkEndpoints } from '@sap-ux/environment-check';

import type { SystemDetails } from '../types';

/**
 * Retrieves the names of all stored endpoints, sorted alphabetically.
 *
 * @param endpoints - Array of system endpoints.
 * @returns An array of endpoint names in sorted order.
 */
export function getEndpointNames(endpoints: Endpoint[]): string[] {
    return endpoints
        .map((endpoint) => endpoint.Name)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' }));
}

/**
 * Static service class to manage and retrieve information about system endpoints.
 * This version uses static members to hold state, so it can be used anywhere in your code.
 */
export class EndpointsManager {
    private static endpoints: Endpoint[] = [];
    private static logger: ToolsLogger;

    /**
     * Initializes the EndpointsManager by setting the logger and loading endpoints.
     *
     * @param logger - The logger instance.
     */
    public static async init(logger: ToolsLogger): Promise<void> {
        this.logger = logger;
        await this.loadEndpoints();
    }

    /**
     * Returns the stored endpoints.
     *
     * @returns An array of system endpoints.
     */
    public static getEndpoints(): Endpoint[] {
        return this.endpoints;
    }

    /**
     * Fetches endpoints from a predefined source and stores them in the static state.
     */
    private static async loadEndpoints(): Promise<void> {
        try {
            const { endpoints } = await checkEndpoints();
            this.endpoints = endpoints;
        } catch (e: any) {
            this.logger?.error(`Failed to fetch endpoints list. Reason: ${e.message}`);
            throw new Error(e.message);
        }
    }

    /**
     * Retrieves authentication details for a specified system, if available.
     *
     * @param system - The system name or URL.
     * @returns System details including client, url, and credentials, or undefined if not found.
     */
    public static async getSystemDetails(system: string): Promise<SystemDetails | undefined> {
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
        } catch (e: any) {
            this.logger.error(`Error fetching credentials from store for system: ${system}`);
            this.logger.debug(e.message);
            return undefined;
        }
        return details;
    }

    /**
     * Determines whether a system requires authentication.
     *
     * @param systemName - The system name to check.
     * @returns True if authentication is required, false otherwise.
     */
    public static getSystemRequiresAuth(systemName: string): boolean {
        return isAppStudio()
            ? this.getDestinationRequiresAuth(systemName)
            : this.getSystemRequiresAuthentication(systemName);
    }

    /**
     * Determines if authentication is not required for accessing a specified system.
     *
     * @param system - The name of the system to check.
     * @returns True if no authentication is required, false otherwise.
     */
    private static getDestinationRequiresAuth(system: string): boolean {
        const found = this.endpoints.find((e: Endpoint) => e.Name === system);
        return found?.Authentication === 'NoAuthentication';
    }

    /**
     * Checks if a specified system requires authentication based on the endpoint information.
     *
     * @param system - The name of the system to check.
     * @returns True if the system requires authentication, false otherwise.
     */
    private static getSystemRequiresAuthentication(system: string): boolean {
        return !(
            this.endpoints.filter((e) => e.Url === system).length > 0 ||
            this.endpoints.filter((e) => e.Name === system).length > 0
        );
    }
}
