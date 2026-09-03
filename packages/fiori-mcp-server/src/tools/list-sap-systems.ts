import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getSystemsOrDestinations } from './services/sap-system.js';

type SapSystemEntry = { name: string; url: string; client: string | undefined };

/**
 * List all SAP systems or destinations available in the current environment (SAP Business Application Studio or local).
 *
 * @returns A promise resolving to an array of SAP system objects.
 */
export async function listSapSystems(): Promise<{ systems: SapSystemEntry[] }> {
    const all = await getSystemsOrDestinations();
    const systems = isAppStudio()
        ? (all as Destination[]).map((d) => ({ name: d.Name, url: d.Host, client: d['sap-client'] }))
        : (all as BackendSystem[]).map((s) => ({ name: s.name, url: s.url, client: s.client }));
    return { systems };
}
