import { ODataVersion } from '@sap-ux/axios-extension';
import type { ODataServiceInfo } from '@sap-ux/axios-extension';

import { getProvider } from './services/abap-context.js';
import type { ODataServiceInput } from '../types/index.js';

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
