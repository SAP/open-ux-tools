import type { CatalogServicesCounts } from '@sap-ux/sap-systems-ext-types';
import type { BackendSystem } from '@sap-ux/store';
import type { AbapServiceProvider, AxiosRequestConfig } from '@sap-ux/axios-extension';
import { AbapCloudEnvironment, createForAbap, createForAbapOnCloud, ODataVersion } from '@sap-ux/axios-extension';

/**
 * Returns an abap service provider for an on-premise system using the specified details.
 *
 * @param param - system details
 * @param param.url - system url
 * @param param.client - system client
 * @param param.username - system username
 * @param param.password - system password
 * @returns abap service provider
 */
function getAbapOnPremServiceProvider({
    url,
    client,
    username,
    password
}: {
    url: string;
    client?: string;
    username?: string;
    password?: string;
}): AbapServiceProvider {
    const systemUrl = new URL(url);

    const axiosConfig: AxiosRequestConfig = {
        baseURL: systemUrl.origin,
        url: systemUrl.pathname,
        ...(client && { params: { 'sap-client': client } }),
        ...(username && password && { auth: { username, password } })
    };

    return createForAbap(axiosConfig);
}

/**
 * Returns an AbapServiceProvider using the specified system details.
 *
 * @param system - the backend system instance
 * @returns an instance of AbapServiceProvider
 */
function getAbapServiceProvider(system: BackendSystem): AbapServiceProvider {
    if (system.systemType === 'S4HC' && system.url) {
        return createForAbapOnCloud({
            environment: AbapCloudEnvironment.EmbeddedSteampunk,
            url: new URL(system.url).toString()
        });
    }

    return getAbapOnPremServiceProvider({
        url: system.url,
        client: system.client,
        username: system.username,
        password: system.password
    });
}

/**
 * Returns the result of listing the services for the V2/V4 catalogs of the specified system.
 *
 * @param system - backend system
 * @returns counts of each odata version services or the error thrown.
 */
export async function getCatalogServiceCount(system: BackendSystem): Promise<CatalogServicesCounts> {
    const abapServiceProvider = getAbapServiceProvider(system);

    const fetchCount = async (version: ODataVersion) => {
        try {
            const catalog = abapServiceProvider.catalog(version);
            const services = await catalog.listServices();
            return { count: services.length };
        } catch (error) {
            return { count: undefined, error };
        }
    };

    const v2Request = await fetchCount(ODataVersion.v2);
    const v4Request = await fetchCount(ODataVersion.v4);

    return { v2Request, v4Request };
}
