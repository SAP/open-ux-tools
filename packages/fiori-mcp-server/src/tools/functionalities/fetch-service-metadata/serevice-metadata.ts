import type { BackendSystem } from '@sap-ux/store';
import type { AxiosRequestConfig, ODataService } from '@sap-ux/axios-extension';

import { AbapServiceProvider, ODataVersion } from '@sap-ux/axios-extension';
import { SystemService } from '@sap-ux/store/dist/services/backend-system';
import { ToolsLogger } from '@sap-ux/logger';

/**
 * Fetches SAP backend systems based on provided parameters.
 *
 * @returns A promise that resolves to an array of BackendSystem objects.
 */
async function getSapSystems(): Promise<BackendSystem[]> {
    const logger = new ToolsLogger({ logPrefix: 'fiori-mcp-server' });
    return new SystemService(logger).getAll({ includeSensitiveData: true });
}

/**
 * Finds a system by its name (partial match).
 *
 * @param query - The partial name to match.
 * @returns The matching system if found.
 */
export async function findSapSystem(query: string): Promise<BackendSystem> {
    const systems = await getSapSystems();

    const sapSystemName = query;
    // try exact match
    let matchingSystems = systems.filter((s) => s.name === query);

    // try case insensitive
    if (!matchingSystems || matchingSystems.length !== 1) {
        query = query.toLocaleLowerCase();
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase() === query);
    }

    // try partial match
    if (!matchingSystems || matchingSystems.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase().startsWith(query));
    }

    if (!matchingSystems || !Array.isArray(matchingSystems)) {
        throw new Error(`No matching system found for name: ${sapSystemName}`);
    }
    if (matchingSystems.length > 1) {
        const names = matchingSystems.map((s) => s.name).join(', ');
        throw new Error(
            `Multiple systems found matching name: ${sapSystemName}. Please be more specific. Matched systems: ${names}`
        );
    }

    return matchingSystems[0];
}

/**
 * Fetches the OData V4 services for a given backend system.
 *
 * @param backendSystem - The backend system to fetch services from.
 * @param servicePath - The path of the service to match.
 * @returns A promise that resolves to an array of ODataServiceInfo objects.
 */
async function getServiceFromSystem(backendSystem: BackendSystem, servicePath: string): Promise<ODataService> {
    const providerConfig: AxiosRequestConfig = {
        baseURL: backendSystem.url,
        params: {
            'sap-client': backendSystem.client
        }
    };
    if (backendSystem.username && backendSystem.password) {
        providerConfig.auth = {
            username: backendSystem.username,
            password: backendSystem.password
        };
    }

    const serviceProvider = new AbapServiceProvider(providerConfig);
    const services = await serviceProvider.catalog(ODataVersion.v4).listServices();

    if (!services?.length) {
        throw new Error('No ODATA V4 Services found on the matched system.');
    }

    const matchedServices = services.filter((s) => s.path === servicePath);
    if (matchedServices.length === 0) {
        throw new Error(`No ODATA V4 Service found matching path: ${servicePath}`);
    }
    if (matchedServices.length > 1) {
        throw new Error(`Multiple ODATA V4 Services found matching path: ${servicePath}`);
    }

    return serviceProvider.service(matchedServices[0].path) as ODataService;
}

/**
 * Fetches the service metadata for a given SAP system and service path.
 *
 * @param sapSystem - The SAP system object.
 * @param servicePath - The path of the service.
 * @returns A promise that resolves to a EDMX metadata XML as string.
 */
export async function getServiceMetadata(sapSystem: BackendSystem, servicePath: string): Promise<string> {
    const service = await getServiceFromSystem(sapSystem, servicePath);
    return service.metadata();
}
