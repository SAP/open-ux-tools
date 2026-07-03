import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import type { AxiosRequestConfig, ODataService } from '@sap-ux/axios-extension';

import { AbapServiceProvider, TlsPatch } from '@sap-ux/axios-extension';
import { getService, getSapToolsDirectory } from '@sap-ux/store';
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
/**
 * Returns all available systems or destinations depending on the current platform.
 * In BAS returns filtered Destination[], in VSCode returns BackendSystem[].
 *
 * @param includeSensitiveData - Whether to include credentials. Defaults to false.
 * @returns A promise resolving to an array of destinations or backend systems.
 */
export async function getSystemsOrDestinations(includeSensitiveData = false): Promise<Destination[] | BackendSystem[]> {
    if (isAppStudio()) {
        const destinations = await listDestinations({ stripS4HCApiHosts: true });
        return Object.values(destinations).filter(
            (d) => isAbapODataDestination(d) && d.Authentication !== Authentication.NO_AUTHENTICATION
        );
    }
    return getSapSystems(includeSensitiveData);
}

/**
 * Finds a system by its name, or url and client (partial match).
 * In BAS returns a Destination, in VSCode returns a BackendSystem.
 *
 * @param query - The name, host or URL to match.
 * @returns An object with the matched system (or undefined) and an optional diagnostic message.
 */
export async function findSystem(query: string): Promise<{ system: BackendSystem | undefined; message?: string }> {
    try {
        const result = findSapSystem((await getSystemsOrDestinations(true)) as BackendSystem[], query);
        return result;
    } catch (e) {
        logger.error(`Error retrieving systems: ${e}`);
        return { system: undefined, message: `Error retrieving systems: ${e}` };
    }
}

function findSapSystem(
    systems: BackendSystem[],
    query: string
): { system: BackendSystem | undefined; message?: string } {
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

    if (!matchingSystems.length) {
        const message = `No matching system found for: ${query}`;
        logger.debug(message);
        return { system: undefined, message };
    }
    if (matchingSystems.length > 1) {
        const names = matchingSystems.map((s) => s.name).join(', ');
        const message = `Multiple systems found matching: ${query}. Please be more specific. Matched systems: ${names}`;
        logger.debug(message);
        return { system: undefined, message };
    }

    return { system: matchingSystems[0] };
}

/**
 * Creates an AbapServiceProvider for a stored backend system.
 *
 * @param backendSystem - The backend system to connect to.
 * @returns A configured AbapServiceProvider instance.
 */
function createAbapServiceProvider(backendSystem: BackendSystem): AbapServiceProvider {
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
    return new AbapServiceProvider(providerConfig);
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
        ? parseUrl(servicePath).path.replace(/\$metadata$/, '')
        : servicePath.replace(/\$metadata$/, '');

    const provider = createAbapServiceProvider(backendSystem);
    return provider.service(normalizedPath) as ODataService;
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
        throw new Error(`Failed to parse service metadata. The service may not be a valid OData V4 service. ${detail}`);
    }
}

/**
 * Fetches the service metadata for a given SAP system and service path.
 *
 * @param system - The BackendSystem to connect to.
 * @param servicePath - The path of the service.
 * @returns A promise that resolves to a EDMX metadata XML as string.
 */
export async function getServiceMetadata(system: BackendSystem, servicePath: string): Promise<string> {
    const service = await getServiceFromBackendSystem(system, servicePath);

    const metadata = await service.metadata();
    checkMetadata(metadata);
    try {
        return format(metadata, { indentation: '    ', lineSeparator: '\n' });
    } catch {
        return metadata;
    }
}
