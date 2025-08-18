import type { ServiceOptions } from './service';
import { Service } from './service';

const serviceStore: Map<string, Service> = new Map();

/**
 * get service from service store (cache)
 * @param options
 * @returns
 */
export async function getService(options: ServiceOptions): Promise<Service> {
    const key = options.serviceName;
    if (!serviceStore.has(key)) {
        serviceStore.set(key, await new Service(options));
    }
    const service = serviceStore.get(key);
    if (!service) {
        throw new Error(`No service: '${key}'`);
    }
    return service;
}

/**
 * remove service from serviceStore - e.g. if it is outdated
 * @param options
 * @returns
 */
export function removeService(options: ServiceOptions): boolean {
    const key = options.serviceName;
    return serviceStore.delete(key);
}
