import type { CatalogResultV2, CatalogResultV4 } from './types';

/**
 * Count the number of services from the result of a catalog call.
 *
 * @param catalogResult - V2 or V4 result of catalog call
 * @returns - number of services
 */
export function countNumberOfServices(catalogResult: CatalogResultV2 | CatalogResultV4): number {
    let numberServices = 0;
    if (Array.isArray(catalogResult?.results)) {
        numberServices = catalogResult.results.length;
    } else if (Array.isArray(catalogResult?.value)) {
        numberServices = catalogResult.value.reduce(
            (count: number, group: { DefaultSystem: { Services: [] } }) => count + group.DefaultSystem.Services.length,
            0
        );
    }
    return numberServices;
}

/**
 * Format string to write number of services, e.g. 1 service or 123 services.
 *
 * @param count - number of service
 * @returns - string with number of services
 */
export function getServiceCountText(count: number) {
    return count === 1 ? `${count} service` : `${count} services`;
}
