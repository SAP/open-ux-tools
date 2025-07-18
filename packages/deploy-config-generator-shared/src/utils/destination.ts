import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import type { Destination } from '@sap-ux/btp-utils';

/**
 * Generate a destination name based on the service path.
 * Remove leading & trailing '/'. Substitute '/' for '_'.
 *
 * @param prefix - prefixes the dest name
 * @param servicePath - used to create a meaningful dest name
 * @returns destination name
 */
export function generateDestinationName(prefix: string, servicePath?: string): string {
    return `${prefix}_${servicePath?.replace(/(^\/)|(\/$)/g, '').replace(/\//g, '_')}`;
}

/**
 * Get the destination with the specified name.
 *
 * @param destName - name of the destination
 * @returns destination object
 */
export async function getDestination(destName?: string): Promise<Destination | undefined> {
    let destination;
    if (isAppStudio() && destName) {
        const destinations = await listDestinations({ stripS4HCApiHosts: true });
        destination = destinations[destName];
    }
    return destination;
}
