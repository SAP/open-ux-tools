import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import type { AxiosRequestConfig, ODataService, ODataServiceInfo } from '@sap-ux/axios-extension';

import { AbapServiceProvider, ODataVersion, TlsPatch, createForDestination } from '@sap-ux/axios-extension';
import { getService, getSapToolsDirectory } from '@sap-ux/store';
import { ToolsLogger } from '@sap-ux/logger';
import { parse as parseEdmx } from '@sap-ux/edmx-parser';
import format from 'xml-formatter';
import { logger } from '../../utils/index.js';
import {
    Authentication,
    type Destination,
    isAbapODataDestination,
    isAppStudio,
    listDestinations
} from '@sap-ux/btp-utils';

// Capture the real SAP tools directory at module load time. In test environments the
// HOME env var may be overridden after process start; SAP_TOOLS_DIR can be set by the
// test harness to point to the real ~/.saptools regardless of HOME.
const SAP_TOOLS_BASE_DIRECTORY = process.env.SAP_TOOLS_DIR || getSapToolsDirectory();

/**
 * Fetches SAP backend systems.
 *
 * @param includeSensitiveData - Whether to include sensitive fields (credentials). Defaults to false.
 * @returns A promise that resolves to an array of BackendSystem objects.
 */
export async function getSapSystems(includeSensitiveData = false): Promise<BackendSystem[]> {
    const logger = new ToolsLogger({ logPrefix: 'fiori-mcp-server' });
    const systemStore = await getService<BackendSystem, BackendSystemKey>({
        logger: logger,
        entityName: 'system',
        options: { baseDirectory: SAP_TOOLS_BASE_DIRECTORY }
    });
    return systemStore.getAll({ includeSensitiveData });
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
 * Finds a destination by name first, then by host if no name match is found.
 *
 * @param destinations - The list of destinations to search.
 * @param query - The query string to match against name or host.
 * @returns The matching destination, or undefined if not found.
 */
function findDestination(destinations: Destination[], query: string): Destination | undefined {
    const queryLower = query.toLocaleLowerCase();

    let match = destinations.find((d) => d.Name === query);
    if (!match) {
        match = destinations.find((d) => d.Name.toLocaleLowerCase() === queryLower);
    }
    if (!match) {
        match = destinations.find((d) => d.Name.toLocaleLowerCase().startsWith(queryLower));
    }
    if (!match) {
        match = destinations.find((d) => d.Name.toLocaleLowerCase().includes(queryLower));
    }

    // Fall back to matching by Host
    if (!match) {
        const { origin } = parseUrl(query);
        const hostQuery = origin || queryLower;
        match = destinations.find((d) => d.Host.toLocaleLowerCase() === hostQuery.toLocaleLowerCase());
        if (!match) {
            match = destinations.find((d) => d.Host.toLocaleLowerCase().includes(hostQuery.toLocaleLowerCase()));
        }
    }

    return match;
}

/**
 * Returns all available systems or destinations depending on the current platform.
 * In BAS returns filtered Destination[], in VSCode returns BackendSystem[].
 *
 * @returns A promise resolving to an array of destinations or backend systems.
 */
export async function getSystemsOrDestinations(): Promise<Destination[] | BackendSystem[]> {
    if (isAppStudio()) {
        const destinations = await listDestinations({ stripS4HCApiHosts: true });
        return Object.values(destinations).filter(
            (d) => isAbapODataDestination(d) && d.Authentication !== Authentication.NO_AUTHENTICATION
        );
    }
    return getSapSystems();
}

/**
 * Finds a system by its name, or url and client (partial match).
 * In BAS returns a Destination, in VSCode returns a BackendSystem.
 *
 * @param query - The name, host or URL to match.
 * @returns The matching system if found.
 */
export async function findSystem(query: string): Promise<BackendSystem | Destination | undefined> {
    if (isAppStudio()) {
        try {
            return findDestination((await getSystemsOrDestinations()) as Destination[], query);
        } catch (e) {
            logger.error(`Error retrieving destinations: ${e}`);
            return undefined;
        }
    }
    return findSapSystem((await getSystemsOrDestinations()) as BackendSystem[], query);
}

function findSapSystem(systems: BackendSystem[], query: string): BackendSystem {
    let matchingSystems = systems.filter((s) => s.name === query);

    const queryLower = query.toLocaleLowerCase();

    if (matchingSystems?.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase() === queryLower);
    }
    if (matchingSystems?.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase().startsWith(queryLower));
    }
    if (matchingSystems?.length !== 1) {
        matchingSystems = systems.filter((s) => s.name.toLocaleLowerCase().includes(queryLower));
    }
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
 * Creates an ODataService from a BackendSystem.
 *
 * @param backendSystem - The backend system to connect to.
 * @param servicePath - The OData service path.
 * @returns A promise resolving to the ODataService instance.
 */
async function getServiceFromBackendSystem(backendSystem: BackendSystem, servicePath: string): Promise<ODataService> {
    const normalizedPath = servicePath.startsWith('http')
        ? parseUrl(servicePath).path.replace(/\/\$metadata$/, '')
        : servicePath.replace(/\/\$metadata$/, '');

    const providerConfig: AxiosRequestConfig = {
        baseURL: backendSystem.url,
        params: { 'sap-client': backendSystem.client }
    };
    if (backendSystem.username && backendSystem.password) {
        providerConfig.auth = { username: backendSystem.username, password: backendSystem.password };
    }
    if (TlsPatch.isPatchRequired(providerConfig.baseURL ?? '')) {
        TlsPatch.apply();
    }
    const serviceProvider = new AbapServiceProvider(providerConfig);

    let services: ODataServiceInfo[] = [];
    try {
        services = await serviceProvider.catalog(ODataVersion.v4).listServices();
    } catch {
        // no services found, fall through to direct path
    }

    const matched = services.filter((s) => s.path === normalizedPath);
    if (matched.length > 1) {
        throw new Error(`Multiple OData V4 services found matching path: ${normalizedPath}`);
    }
    return serviceProvider.service(matched.length === 1 ? matched[0].path : normalizedPath) as ODataService;
}

/**
 * Creates an ODataService from a BTP Destination.
 *
 * @param destination - The BTP destination to connect to.
 * @param servicePath - The OData service path.
 * @returns The ODataService instance.
 */
function getServiceFromDestination(destination: Destination, servicePath: string): ODataService {
    const normalizedPath = servicePath.replace(/\/\$metadata$/, '');
    const serviceProvider = createForDestination({}, destination);
    return serviceProvider.service(normalizedPath) as ODataService;
}

/**
 * Checks if the provided metadata is a valid (parseable, and not error).
 *
 * @param metadata - The EDMX metadata XML as string.
 * @throws An error if the metadata is not valid.
 */
function checkMetadata(metadata: string): void {
    let parsedMetadata: unknown;
    let parseError: unknown;
    try {
        parsedMetadata = parseEdmx(metadata);
    } catch (error) {
        parseError = error;
        logger.debug(error);
    }
    if (!parsedMetadata) {
        const detail = parseError instanceof Error ? ` Reason: ${parseError.message}` : '';
        throw new Error(`Failed to parse service metadata. The service may not be a valid OData V4 service.${detail}`);
    }
}

/**
 * Fetches the service metadata for a given SAP system or destination and service path.
 *
 * @param system - The BackendSystem or Destination to connect to.
 * @param servicePath - The path of the service.
 * @returns A promise that resolves to a EDMX metadata XML as string.
 */
export async function getServiceMetadata(system: BackendSystem | Destination, servicePath: string): Promise<string> {
    // isAppStudio() is the authoritative discriminant: BAS always yields Destination, VSCode always BackendSystem
    const service = isAppStudio()
        ? getServiceFromDestination(system as Destination, servicePath)
        : await getServiceFromBackendSystem(system as BackendSystem, servicePath);

    const metadata = await service.metadata();
    checkMetadata(metadata);
    try {
        return format(metadata, { indentation: '    ', lineSeparator: '\n' });
    } catch {
        return metadata;
    }
}
