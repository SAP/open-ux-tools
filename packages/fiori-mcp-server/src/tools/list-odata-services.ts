import { ODataVersion } from '@sap-ux/axios-extension';
import type { ODataServiceInfo } from '@sap-ux/axios-extension';

import { getProvider } from './services/abap-context.js';
import type { ODataServiceInput } from '../types/index.js';

/**
 * Lists OData V2 and V4 services available in the target system's catalog.
 * Both catalogs are fetched in parallel and their results are merged.
 *
 * @param params Input parameters including `appPath` and an optional `filter` string.
 * @returns Combined service catalog entries, filtered by name when `filter` is provided.
 */
export async function listODataServices(params: ODataServiceInput): Promise<ODataServiceInfo[]> {
    const provider = await getProvider(params.appPath);

    const [catalogV2, catalogV4] = await Promise.all([
        provider.catalog(ODataVersion.v2),
        provider.catalog(ODataVersion.v4)
    ]);

    catalogV2.isS4Cloud = Promise.resolve(true);
    catalogV4.isS4Cloud = Promise.resolve(true);

    const [v2Services, v4Services] = await Promise.all([
        catalogV2.listServices(),
        catalogV4.listServices()
    ]);

    const needle = (params.filter ?? '').toUpperCase();
    return [...v2Services, ...v4Services].filter((service) => service.name.includes(needle));
}
