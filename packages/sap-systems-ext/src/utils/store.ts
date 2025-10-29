import { getService, BackendSystemKey, type BackendSystem, type Service } from '@sap-ux/store';
import SystemsLogger from './logger';

/**
 *  Get the backend system service instance.
 *
 * @returns the backend system service instance
 */
export async function getBackendSystemService(): Promise<Service<BackendSystem, BackendSystemKey>> {
    const backendService = await getService<BackendSystem, BackendSystemKey>({
        logger: SystemsLogger.logger,
        entityName: 'system'
    });
    return backendService;
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
