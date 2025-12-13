import { getService } from '@sap-ux/store';
import type { ToolsLogger } from '@sap-ux/logger';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';

import type { Endpoint } from '../types';
import { type AbapServiceProvider, AdaptationProjectType } from '@sap-ux/axios-extension';
import { t } from '../i18n';

export enum SupportedProject {
    ON_PREM = 'onPremise',
    CLOUD_READY = 'cloudReady',
    CLOUD_READY_AND_ON_PREM = 'cloudReadyAndOnPrem'
}

/**
 * Gets the supported project types for the system. A system can support cloudReady, onPremise or both types of project.
 *
 * @param provider - The ABAP service provider.
 * @returns {Promise<SupportedProject>} The supported project types.
 */
export async function getSupportedProject(provider: AbapServiceProvider): Promise<SupportedProject> {
    const layerdRepositoryService = provider.getLayeredRepository();
    const systemInfo = await layerdRepositoryService.getSystemInfo();
    const { adaptationProjectTypes } = systemInfo;

    const hasCloudReady = adaptationProjectTypes?.includes(AdaptationProjectType.CLOUD_READY);
    const hasOnPrem = adaptationProjectTypes?.includes(AdaptationProjectType.ON_PREMISE);

    if (hasCloudReady && hasOnPrem) {
        return SupportedProject.CLOUD_READY_AND_ON_PREM;
    } else if (hasCloudReady) {
        return SupportedProject.CLOUD_READY;
    } else if (hasOnPrem) {
        return SupportedProject.ON_PREM;
    }

    throw new Error(t('error.projectTypeNotProvided'));
}

/**
 * Retrieves the names of all stored systems, sorted alphabetically.
 *
 * @param {Endpoint[]} systems - Array of system systems.
 * @returns {string[]} An array of endpoint names as strings in sorted order.
 */
export function getEndpointNames(systems: Endpoint[]): string[] {
    return systems
        .map((endpoint) => endpoint.Name)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' }));
}

/**
 * Transforms a BackendSystem object into an object matching the legacy Endpoint interface.
 *
 * @param {BackendSystem} system - The backend system to transform.
 * @returns {Endpoint} The transformed endpoint object.
 */
export const transformBackendSystem = (system: BackendSystem): Endpoint => ({
    Name: system.name,
    Url: system.url,
    Client: system.client,
    UserDisplayName: system.userDisplayName,
    Scp: !!system.serviceKeys,
    Authentication: system.authenticationType,
    Credentials: {
        username: system.username,
        password: system.password
    }
});

/**
 * Service class to manage and retrieve information about system systems,
 * including their names, authentication requirements, and specific details.
 */
export class SystemLookup {
    private systems: Endpoint[];

    /**
     * Creates an instance of EndpointsManager.
     *
     * @param {ToolsLogger} logger - The logger.
     */
    constructor(private readonly logger: ToolsLogger) {}

    /**
     * Returns the stored systems.
     *
     * @returns {Promise<Endpoint[]>} An array of system systems.
     */
    public async getSystems(): Promise<Endpoint[]> {
        if (!this.systems) {
            this.systems = await this.loadSystems();
        }
        return this.systems;
    }

    /**
     * Loads systems from either BAS (via destinations) or from the backend system store.
     *
     * @returns {Promise<Endpoint[]>} A promise that resolves with an array of endpoints.
     * @throws {Error} If fetching the systems fails.
     */
    private async loadSystems(): Promise<Endpoint[]> {
        try {
            let endpoints: Endpoint[] = [];
            if (isAppStudio()) {
                const destinations = await listDestinations({
                    stripS4HCApiHosts: true
                });
                endpoints = Object.values(destinations).filter((dest) => dest.WebIDEUsage?.includes('dev_abap'));
            } else {
                const systemStore = await getService<BackendSystem, BackendSystemKey>({
                    entityName: 'system'
                });
                const backendSystems = await systemStore?.getAll();
                endpoints = backendSystems.map(transformBackendSystem);
            }
            return endpoints;
        } catch (e) {
            this.logger?.error(`Failed to fetch systems list. Reason: ${e.message}`);
            throw new Error(e.message);
        }
    }

    /**
     * Retrieves a particular system by its name.
     *
     * @param {string} name - The system name or URL.
     * @returns {Promise<Endpoint | undefined>} System details including client, url, and credentials, or undefined if not found.
     */
    public async getSystemByName(name: string): Promise<Endpoint | undefined> {
        const systems = await this.getSystems();
        const system = systems.find((e) => e.Name === name || e.Url === name);

        if (!system) {
            this.logger.warn(`No endpoint found for system: ${name}`);
            return undefined;
        }

        return system;
    }

    /**
     * Determines whether a system requires authentication based on environment.
     *
     * @param {string} system - The system name or URL.
     * @returns {Promise<boolean>} A promise that resolves to true if authentication is required, false otherwise.
     */
    public async getSystemRequiresAuth(system: string): Promise<boolean> {
        const found = await this.getSystemByName(system);

        if (isAppStudio()) {
            return found?.Authentication === 'NoAuthentication';
        } else {
            return !found;
        }
    }
}
