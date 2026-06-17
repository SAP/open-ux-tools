import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getSystemsOrDestinations } from './functionalities/fetch-service-metadata/service-metadata.js';

/**
 * Lists all SAP systems stored in the user's environment.
 *
 * @returns A promise resolving to an array of SAP system objects.
 */
export async function listSapSystems(): Promise<object> {
    const all = await getSystemsOrDestinations();
    const systems = isAppStudio()
        ? (all as Destination[]).map((d) => ({ name: d.Name, url: d.Host, client: d['sap-client'] }))
        : (all as BackendSystem[]).map((s) => ({ name: s.name, url: s.url, client: s.client }));
    return { systems };
}
