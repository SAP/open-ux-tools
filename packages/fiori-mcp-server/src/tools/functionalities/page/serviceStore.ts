import type { ServiceOptions } from './service';
import { Service } from './service';

const serviceStore: Map<string, Service> = new Map();

/**
 * Get service from service store (cache).
 *
 * @param options Service options.
 * @returns Resolved service from service store (cache).
 */
export async function getService(options: ServiceOptions): Promise<Service> {
    const key = options.serviceName;
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
 * Remove service from serviceStore - e.g. if it is outdated.
 *
 * @param options
 * @returns
 */
export function removeService(options: ServiceOptions): boolean {
    const key = options.serviceName;
    return serviceStore.delete(key);
}
