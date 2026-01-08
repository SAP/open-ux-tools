import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import type { AxiosRequestConfig, ODataService, ODataServiceInfo } from '@sap-ux/axios-extension';

import { AbapServiceProvider, ODataVersion } from '@sap-ux/axios-extension';
import { getService } from '@sap-ux/store';
import { ToolsLogger } from '@sap-ux/logger';
import { parse as parseEdmx } from '@sap-ux/edmx-parser';

/**
 * Fetches SAP backend systems.
 *
 * @returns A promise that resolves to an array of BackendSystem objects.
 */
async function getSapSystems(): Promise<BackendSystem[]> {
    const logger = new ToolsLogger({ logPrefix: 'fiori-mcp-server' });
    const systemStore = await getService<BackendSystem, BackendSystemKey>({
        logger: logger,
        entityName: 'system'
    });
    return systemStore.getAll({ includeSensitiveData: true });
}

/**
 * Extracts the origin, path and client from a given URL.
 *
 * @param url - The URL to extract from.
 * @returns An object containing the origin, path and client.
 */
function parseUrl(url: string): { origin: string; client: string; path: string } {
    let origin = '';
    let client = '';
    let path = '';

    if (url.startsWith('http')) {
        try {
            const parsedUrl = new URL(url);
            origin = parsedUrl.origin;
            client = parsedUrl.searchParams.get('sap-client') ?? '';
            path = parsedUrl.pathname;
        } catch {
            // invalid URL
        }
    }
    return { origin, client, path };
}

/**
 * Matches systems by URL and client.
 *
 * @param systems - The list of systems to match against.
 * @param url - host url without query params
 * @returns An array of matching BackendSystem objects.
 */
function matchSystemByUrl(systems: BackendSystem[], url: string): BackendSystem[] {
    const { origin, client } = parseUrl(url);
    if (!origin) {
        return [] as BackendSystem[];
    }

    let matchingSystems = systems.filter((s) => s.url.startsWith(origin) && (!client || s.client === client));
    if (!matchingSystems.length) {
        // try without client
        matchingSystems = systems.filter((s) => s.url.startsWith(origin));
    }
    if (!matchingSystems.length) {
        // system not stored. Return raw props for further processing
        matchingSystems = [{ name: origin, url: origin, client } as BackendSystem];
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

    if (matchingSystems?.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase() === queryLower);
    }

    // try partial match from start
    if (matchingSystems?.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase().startsWith(queryLower));
    }

    // try partial match anywhere in name
    if (matchingSystems?.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase().includes(queryLower));
    }

    // try match system by host url
    if (matchingSystems?.length !== 1) {
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

    let services: ODataServiceInfo[] = [];
    try {
        services = await serviceProvider.catalog(ODataVersion.v4).listServices();
    } catch {
        // no services found
    }

    const matchedServices = services.filter((s) => s.path === servicePath);

    if (matchedServices.length > 1) {
        throw new Error(`Multiple ODATA V4 Services found matching path: ${servicePath}`);
    }
    if (matchedServices.length === 1) {
        return serviceProvider.service(matchedServices[0].path) as ODataService;
    }

    // try to fetch service directly (if user provided full URL as servicePath)
    if (servicePath.startsWith('http')) {
        servicePath = parseUrl(servicePath).path;
    }
    return serviceProvider.service(servicePath) as ODataService;
}

/**
 * Checks if the provided metadata is a valid (parseable, and not error).
 *
 * @param metadata - The EDMX metadata XML as string.
 * @throws An error if the metadata is not valid.
 */
function checkMetadata(metadata: string): void {
    let parsedMetadata: unknown;
    try {
        parsedMetadata = parseEdmx(metadata);
    } catch {
        /* error handled below */
    }
    if (!parsedMetadata) {
        throw new Error('Failed to parse service metadata. The service may not be a valid OData V4 service.');
    }
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
    const metadata = await service.metadata();
    checkMetadata(metadata);
    return metadata;
}
