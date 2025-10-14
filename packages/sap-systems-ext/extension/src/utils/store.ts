import { BackendSystemKey, SystemService, type BackendSystem } from '@sap-ux/store';
import SystemsLogger from './logger';

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
    const systemService = new SystemService(SystemsLogger.logger);
    const backendSystem = await systemService.read(backendSystemKey);
    return backendSystem;
}
