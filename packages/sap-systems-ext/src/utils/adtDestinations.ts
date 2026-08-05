import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { commands, extensions } from 'vscode';
import { discoverHttpsEndpoint } from './abapEndpointDiscovery';

/** Command exposed by the ADT (adt-vscode) extension that returns destinations with resolved HTTP details. */
const ADT_GET_DESTINATIONS_COMMAND = 'adt-vscode.getDestinationsWithHttpDetails';
/** Extension id of the ADT language-server VS Code client. */
const ADT_EXTENSION_ID = 'SAPSE.adt-vscode';
/** Location of the ADT destinations file used by the fallback resolver. */
const ADT_DESTINATIONS_FILE = join(homedir(), '.adtls', 'destinations.json');

/**
 * A single ABAP destination together with its resolved HTTP connection details.
 * Mirrors the shape returned by the adt-vscode `getDestinationsWithHttpDetails` command.
 */
export interface AdtDestinationHttpDetails {
    /** Destination id (e.g. "SID_100_USER_EN"); used as the SAP system name. */
    id: string;
    /** Destination protocol, e.g. "rfc" or "http". */
    protocol?: string;
    /** ABAP system id (SID), when available. */
    systemId?: string;
    /** SAP client, when available. */
    client?: string;
    /** Logon user of the destination, when available. */
    user?: string;
    /** Resolved external HTTPS base URL (e.g. "https://host:port"), or undefined if unresolved. */
    url?: string;
    /** Host parsed from the resolved URL. */
    host?: string;
    /** Port parsed from the resolved URL. */
    port?: string;
}

/**
 * Raw structure of ~/.adtls/destinations.json (only the fields this resolver needs).
 */
interface AdtDestinationsFile {
    destinations?: {
        id: string;
        protocol?: string;
        properties?: Record<string, string>;
    }[];
}

/**
 * Resolves ABAP destinations with their HTTP connection details.
 *
 * Primary path: asks the ADT (adt-vscode) extension via its
 * `adt-vscode.getDestinationsWithHttpDetails` command, which resolves the authoritative HTTP
 * endpoint for each destination (over the RFC tunnel + ADT discovery for RFC destinations).
 *
 * Fallback path: if the ADT extension/command is not available, reads
 * ~/.adtls/destinations.json directly and, for each destination, discovers the external HTTPS
 * endpoint by probing the message server / application server (see {@link discoverHttpsEndpoint}).
 * The RFC message-server port is never used for HTTP.
 *
 * @returns the list of destinations with whatever HTTP details could be resolved
 */
export async function resolveAdtDestinations(): Promise<AdtDestinationHttpDetails[]> {
    const viaCommand = await resolveViaAdtCommand();
    if (viaCommand) {
        return viaCommand;
    }
    return resolveFromFile();
}

/**
 * Attempts to resolve destinations via the ADT extension command.
 *
 * @returns the resolved destinations, or undefined if the ADT extension/command is unavailable
 */
async function resolveViaAdtCommand(): Promise<AdtDestinationHttpDetails[] | undefined> {
    // Only attempt the command when the ADT extension is present; executeCommand would otherwise
    // reject with "command not found", which we treat the same as "unavailable".
    if (!extensions.getExtension(ADT_EXTENSION_ID)) {
        return undefined;
    }
    try {
        const result = await commands.executeCommand<AdtDestinationHttpDetails[]>(ADT_GET_DESTINATIONS_COMMAND);
        return Array.isArray(result) ? result : undefined;
    } catch {
        // Command not registered (extension not activated / older version) — fall back to the file.
        return undefined;
    }
}

/**
 * Reads destinations directly from ~/.adtls/destinations.json and, for each destination that has a
 * message server, discovers its external HTTPS endpoint (host/port/url). Destinations whose endpoint
 * cannot be discovered are still returned, but without url/host/port.
 *
 * @returns destination metadata with discovered HTTPS details where possible
 */
async function resolveFromFile(): Promise<AdtDestinationHttpDetails[]> {
    let raw: string;
    try {
        raw = readFileSync(ADT_DESTINATIONS_FILE, 'utf8');
    } catch {
        // No destinations file present.
        return [];
    }
    const parsed = JSON.parse(raw) as AdtDestinationsFile;
    return Promise.all(
        (parsed.destinations ?? []).map(async (dest): Promise<AdtDestinationHttpDetails> => {
            const client = dest.properties?.client;
            const messageServer = dest.properties?.messageServer;
            const base: AdtDestinationHttpDetails = {
                id: dest.id,
                protocol: dest.protocol,
                systemId: dest.properties?.systemId,
                client,
                user: dest.properties?.user
            };
            if (!messageServer) {
                return base;
            }
            const endpoint = await discoverHttpsEndpoint(messageServer, client);
            return endpoint ? { ...base, url: endpoint.url, host: endpoint.host, port: endpoint.port } : base;
        })
    );
}
