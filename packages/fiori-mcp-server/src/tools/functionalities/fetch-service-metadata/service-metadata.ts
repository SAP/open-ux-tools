import type { BackendSystem } from '@sap-ux/store';
import type { AxiosRequestConfig, ODataService } from '@sap-ux/axios-extension';

import { AbapServiceProvider, ODataVersion } from '@sap-ux/axios-extension';
import { SystemService } from '@sap-ux/store/dist/services/backend-system';
import { ToolsLogger } from '@sap-ux/logger';

/**
 * Fetches SAP backend systems.
 *
 * @returns A promise that resolves to an array of BackendSystem objects.
 */
async function getSapSystems(): Promise<BackendSystem[]> {
    const logger = new ToolsLogger({ logPrefix: 'fiori-mcp-server' });
    return new SystemService(logger).getAll({ includeSensitiveData: true });
}

/**
 * Extracts the origin and client from a given URL.
 *
 * @param url - The URL to extract from.
 * @returns An object containing the origin and client.
 */
function getHostAndClientFromUrl(url: string): { origin: string; client: string } {
    let origin = '';
    let client = '';

    if (url.startsWith('http')) {
        try {
            const parsedUrl = new URL(url);
            origin = parsedUrl.origin;
            client = parsedUrl.searchParams.get('sap-client') ?? '';
        } catch {
            // invalid URL
        }
    }
    return { origin, client };
}

/**
 * Matches systems by URL and client.
 *
 * @param systems - The list of systems to match against.
 * @param url - host url without query params
 * @returns An array of matching BackendSystem objects.
 */
function matchSystemByUrl(systems: BackendSystem[], url: string): BackendSystem[] {
    const { origin, client } = getHostAndClientFromUrl(url);
    if (!origin) {
        return [] as BackendSystem[];
    }

    let matchingSystems = systems.filter((s) => s.url.startsWith(origin) && (!client || s.client === client));
    if (!matchingSystems || matchingSystems.length === 0) {
        // try without client
        matchingSystems = systems.filter((s) => s.url.startsWith(origin));
    }
    if (!matchingSystems || matchingSystems.length === 0) {
        // system not stored. Return raw props for further processing
        matchingSystems = [{ name: origin, url: origin, client }];
    }
    return matchingSystems;
}

/**
 * Finds a system by its name, or url and client (partial match).
 *
 * @param query - The partial name to match.
 * @returns The matching system if found.
 */
export async function findSapSystem(query: string): Promise<BackendSystem> {
    const systems = await getSapSystems();

    // try exact match
    let matchingSystems = systems.filter((s) => s.name === query);

    // try case insensitive
    const queryLower = query.toLocaleLowerCase();

    if (!matchingSystems || matchingSystems.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase() === queryLower);
    }

    // try partial match from start
    if (!matchingSystems || matchingSystems.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase().startsWith(queryLower));
    }

    // try partial match anywhere in name
    if (!matchingSystems || matchingSystems.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase().includes(queryLower));
    }

    // try match system by host url
    if (!matchingSystems || matchingSystems.length !== 1) {
        matchingSystems = matchSystemByUrl(systems, query);
    }

    if (!matchingSystems || !Array.isArray(matchingSystems)) {
        throw new Error(`No matching system found for: ${query}`);
    }
    if (matchingSystems.length > 1) {
        const names = matchingSystems.map((s) => s.name).join(', ');
        throw new Error(
            `Multiple systems found matching: ${query}. Please be more specific. Matched systems: ${names}`
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
    if (matchedServices.length > 1) {
        throw new Error(`Multiple ODATA V4 Services found matching path: ${servicePath}`);
    }
    if (matchedServices.length === 1) {
        return serviceProvider.service(matchedServices[0].path) as ODataService;
    }
    return serviceProvider.service(servicePath) as ODataService;
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
