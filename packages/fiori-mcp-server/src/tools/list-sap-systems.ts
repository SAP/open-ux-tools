import { getSapSystems } from './functionalities/fetch-service-metadata/service-metadata';

/**
 * Lists all SAP systems stored in the user's environment.
 *
 * @returns A promise resolving to an array of SAP system objects.
 */
export async function listSapSystems(): Promise<object> {
    const systems = await getSapSystems();
    return {
        systems: systems.map((s) => ({
            name: s.name,
            url: s.url,
            client: s.client
        }))
    };
}
