import { join } from 'node:path';
import type { ServiceOptions } from './service';
import { Service } from './service';

const serviceStore: Map<string, Service> = new Map();

/**
 * Generates a unique storage key for a service by combining the project root,
 * application name, and service name into a single path-like string.
 *
 * @param options The configuration options for the service.
 * @returns A unique key string representing the service’s storage path.
 */
function getServiceStorageKey(options: ServiceOptions): string {
    // Unique key as combination of app path and service key
    return join(options.project.root, options.appName, options.serviceName);
}

/**
 * Get service from service store (cache).
 *
 * @param options Service options.
 * @returns Resolved service from service store (cache).
 */
export async function getService(options: ServiceOptions): Promise<Service> {
    const key = getServiceStorageKey(options);
    if (!serviceStore.has(key)) {
        serviceStore.set(key, new Service(options));
    }
    const service = serviceStore.get(key);
    if (!service) {
        throw new Error(`No service: '${key}'`);
    }
    return service;
}

/**
 * Removes a service from the `serviceStore`.
 *
 * @param options - The configuration object containing details about the service.
 * @returns `true` if the service was removed successfully.
 */
export function removeService(options: ServiceOptions): boolean {
    const key = getServiceStorageKey(options);
    return serviceStore.delete(key);
}
