import type { Service, BackendSystem } from '@sap-ux/store';

import SystemsLogger from './logger';
import { getService, BackendSystemKey } from '@sap-ux/store';

let serviceCache: Service<BackendSystem, BackendSystemKey>;

/**
 * Returns the backend system service, creating it if it doesn't already exist.
 *
 * @returns the backend system service
 */
export async function getBackendSystemService(): Promise<Service<BackendSystem, BackendSystemKey>> {
    serviceCache =
        serviceCache ??
        (await getService<BackendSystem, BackendSystemKey>({ logger: SystemsLogger.logger, entityName: 'system' }));
    return serviceCache;
}

/**
 * Fetches a backend system based on the provided system details.
 *
 * @param system - the system details
 * @param system.url - the system URL
 * @param system.client - the system client (optional)
 * @returns - the backend system if found, otherwise undefined
 */
export async function getBackendSystem(system: { url: string; client?: string }): Promise<BackendSystem | undefined> {
    const backendSystemKey = new BackendSystemKey({
        url: system.url,
        client: system?.client
    });
    const systemService = await getBackendSystemService();
    const backendSystem = await systemService.read(backendSystemKey);
    return backendSystem;
}
