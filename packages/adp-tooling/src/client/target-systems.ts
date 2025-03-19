import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Endpoint } from '@sap-ux/environment-check';
import { checkEndpoints } from '@sap-ux/environment-check';
import { getCredentialsFromStore } from '@sap-ux/system-access';

import type { SystemDetails } from '../types';

/**
 * Retrieves the names of all stored systems, sorted alphabetically.
 *
 * @param systems - Array of system systems.
 * @returns An array of endpoint names in sorted order.
 */
export function getEndpointNames(systems: Endpoint[]): string[] {
    return systems
        .map((endpoint) => endpoint.Name)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' }));
}

/**
 * Service class to manage and retrieve information about system systems,
 * including their names, authentication requirements, and specific details.
 */
export class TargetSystems {
    private systems: Endpoint[];

    /**
     * Creates an instance of EndpointsManager.
     *
     * @param {ToolsLogger} logger - The logger.
     */
    constructor(private logger: ToolsLogger) {}

    /**
     * Returns the stored systems.
     *
     * @returns An array of system systems.
     */
    public async getSystems(): Promise<Endpoint[]> {
        if (!this.systems) {
            this.systems = await this.loadSystems();
        }
        return this.systems;
    }

    /**
     * Fetches systems from a predefined source and stores them in the static state.
     */
    private async loadSystems(): Promise<Endpoint[]> {
        try {
            const { endpoints } = await checkEndpoints();
            return endpoints;
        } catch (e) {
            this.logger?.error(`Failed to fetch systems list. Reason: ${e.message}`);
            throw new Error(e.message);
        }
    }

    /**
     * Retrieves authentication details for a specified system, if available.
     *
     * @param system - The system name or URL.
     * @returns System details including client, url, and credentials, or undefined if not found.
     */
    public async getSystemDetails(system: string): Promise<SystemDetails | undefined> {
        const systems = await this.getSystems();
        const endpoint = systems.find((e) => e.Name === system || e.Url === system);
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

    /**
     * Determines whether a system requires authentication based on environment.
     *
     * @param system - The system name or URL.
     * @returns A promise that resolves to true if authentication is required, false otherwise.
     */
    public async getSystemRequiresAuth(system: string): Promise<boolean> {
        const systems = await this.getSystems();

        if (isAppStudio()) {
            const found = systems.find((e: Endpoint) => e.Name === system);

            if (!found) {
                throw new Error(`System: ${system} not found in AppStudio environment.`);
            }

            return found.Authentication === 'NoAuthentication';
        } else {
            return !systems.find((e: Endpoint) => e.Url === system || e.Name === system);
        }
    }
}
