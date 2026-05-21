import type { ODataServiceInput } from '../types';
import { getAvailableODataServices } from './functionalities/manifest-changes/manifestContext';

/**
 * Lists all available OData services from the specified SAP system.
 *
 * @param params - Input parameters for listing OData services.
 * @returns A promise resolving to an array of OData service objects.
 */
export async function listODataServices(params: ODataServiceInput): Promise<Array<object>> {
    const services = await getAvailableODataServices(params.appPath, params.filter ?? '');
    return services;
}
