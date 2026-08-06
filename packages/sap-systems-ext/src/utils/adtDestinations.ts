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
 * Lists ABAP destinations WITHOUT resolving their HTTP endpoints.
 *
 * Resolving an HTTP endpoint requires a logon/connection, so it must NOT be done for every
 * destination just to build a list. This returns lightweight metadata only (id/protocol/systemId/
 * client/user). Use {@link resolveAdtDestination} to resolve a single destination's endpoint.
 *
 * Primary path: the ADT (adt-vscode) extension's `getDestinationsWithHttpDetails` command with an
 * optional protocol filter (returns metadata, no connection). Fallback: read
 * ~/.adtls/destinations.json directly.
 *
 * @param protocol - optional protocol filter, e.g. `['rfc']`; when omitted all protocols are returned
 * @returns metadata for the matching destinations (no url/host/port)
 */
export async function listAdtDestinations(protocol?: string[]): Promise<AdtDestinationHttpDetails[]> {
    const viaCommand = await listViaAdtCommand(protocol);
    if (viaCommand) {
        return viaCommand;
    }
    return listFromFile(protocol);
}

/**
 * Resolves the HTTP connection details for a SINGLE ABAP destination. This is the only call that
 * triggers a connection/logon for that destination.
 *
 * Primary path: the ADT command with a `{ id }` filter (resolves just that destination). Fallback:
 * read the destination from ~/.adtls/destinations.json and discover its HTTPS endpoint by probing
 * the message server / application server (see {@link discoverHttpsEndpoint}). The RFC message-server
 * port is never used for HTTP.
 *
 * @param id destination id to resolve
 * @returns the destination with its resolved url/host/port, or undefined if not found
 */
export async function resolveAdtDestination(id: string): Promise<AdtDestinationHttpDetails | undefined> {
    const viaCommand = await resolveViaAdtCommand(id);
    if (viaCommand) {
        return viaCommand;
    }
    return resolveFromFile(id);
}

/**
 * Lists destinations via the ADT extension command (metadata only, no connection), optionally
 * filtered by protocol.
 *
 * @param protocol - optional protocol filter
 * @returns the destinations, or undefined if the ADT extension/command is unavailable
 */
async function listViaAdtCommand(protocol?: string[]): Promise<AdtDestinationHttpDetails[] | undefined> {
    if (!extensions.getExtension(ADT_EXTENSION_ID)) {
        return undefined;
    }
    try {
        const result = await commands.executeCommand<AdtDestinationHttpDetails[]>(
            ADT_GET_DESTINATIONS_COMMAND,
            protocol ? { protocol } : undefined
        );
        return Array.isArray(result) ? result : undefined;
    } catch {
        // Command not registered (extension not activated / older version) — fall back to the file.
        return undefined;
    }
}

/**
 * Resolves a single destination via the ADT extension command, passing a `{ id }` filter so only
 * that destination is connected to and resolved.
 *
 * @param id destination id to resolve
 * @returns the resolved destination, or undefined if the ADT extension/command is unavailable
 */
async function resolveViaAdtCommand(id: string): Promise<AdtDestinationHttpDetails | undefined> {
    if (!extensions.getExtension(ADT_EXTENSION_ID)) {
        return undefined;
    }
    try {
        const result = await commands.executeCommand<AdtDestinationHttpDetails[]>(ADT_GET_DESTINATIONS_COMMAND, {
            id
        });
        return Array.isArray(result) ? result.find((d) => d.id === id) : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Reads destinations' metadata directly from ~/.adtls/destinations.json (no endpoint discovery),
 * optionally filtered by protocol.
 *
 * @param protocol - optional protocol filter
 * @returns metadata for the matching destinations
 */
function listFromFile(protocol?: string[]): AdtDestinationHttpDetails[] {
    const protocols = protocol?.map((p) => p.toLowerCase());
    return readDestinationsFile()
        .filter((dest) => !protocols || protocols.includes((dest.protocol ?? '').toLowerCase()))
        .map((dest) => ({
            id: dest.id,
            protocol: dest.protocol,
            systemId: dest.properties?.systemId,
            client: dest.properties?.client,
            user: dest.properties?.user
        }));
}

/**
 * Reads a single destination from ~/.adtls/destinations.json and discovers its external HTTPS
 * endpoint (host/port/url) by probing the message server / application server.
 *
 * @param id destination id to resolve
 * @returns the destination with discovered HTTPS details, or undefined if not found
 */
async function resolveFromFile(id: string): Promise<AdtDestinationHttpDetails | undefined> {
    const dest = readDestinationsFile().find((d) => d.id === id);
    if (!dest) {
        return undefined;
    }
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
}

/**
 * Reads and parses the destinations array from ~/.adtls/destinations.json.
 *
 * @returns the destination entries, or an empty array if the file is missing/unreadable
 */
function readDestinationsFile(): NonNullable<AdtDestinationsFile['destinations']> {
    try {
        const raw = readFileSync(ADT_DESTINATIONS_FILE, 'utf8');
        return (JSON.parse(raw) as AdtDestinationsFile).destinations ?? [];
    } catch {
        // No destinations file present.
        return [];
    }
}
