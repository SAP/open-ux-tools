import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Logger } from '@sap-ux/logger';
import { BackendSystem, BackendSystemKey } from '../entities/backend-system.js';
import { AuthenticationType, ConnectionType, SystemSource, SystemType } from '../types.js';

/** Location of ADT's destinations file. */
const ADT_DESTINATIONS_FILE = join(homedir(), '.adtls', 'destinations.json');

/** Destination protocol handled as a live SAP system (HTTP/cloud destinations). */
const HTTP_PROTOCOL = 'http';
/** ADT authentication kind mapped to reentrance-ticket auth. */
const AUTH_KIND_REENTRANCE_TICKET = 'reentranceticket';

/**
 * Raw shape of a single entry in ADT's `destinations.json`.
 */
interface AdtDestination {
    id: string;
    protocol: string;
    properties?: Record<string, string>;
}

/**
 * Raw shape of ADT's `destinations.json` file.
 */
interface AdtDestinationsFile {
    formatVersion?: string;
    destinations?: AdtDestination[];
}

/**
 * Reads ADT's destinations file, returning its parsed content (or an empty structure if missing).
 *
 * @returns the parsed destinations file
 */
function readDestinationsFile(): AdtDestinationsFile {
    if (!existsSync(ADT_DESTINATIONS_FILE)) {
        return { destinations: [] };
    }
    const raw = readFileSync(ADT_DESTINATIONS_FILE, 'utf8');
    return JSON.parse(raw) as AdtDestinationsFile;
}

/**
 * Determines whether a destination is an HTTP destination that should surface as an SAP system.
 *
 * @param dest - the destination entry
 * @returns true if it is an HTTP destination with a system URL
 */
function isHttpSystemDestination(dest: AdtDestination): boolean {
    return dest.protocol?.toLowerCase() === HTTP_PROTOCOL && !!dest.properties?.systemUrl;
}

/**
 * Maps an ADT HTTP destination to an in-memory {@link BackendSystem} tagged with the ADT origin.
 * Reentrance-ticket destinations are represented as "ABAP Environment on SAP BTP" systems.
 *
 * @param dest - the destination entry (must be an HTTP system destination)
 * @returns the backend system, or undefined if it cannot be mapped
 */
function toBackendSystem(dest: AdtDestination): BackendSystem | undefined {
    const url = dest.properties?.systemUrl;
    if (!url) {
        return undefined;
    }
    const authKind = dest.properties?.authenticationKind?.toLowerCase();
    const authenticationType =
        authKind === AUTH_KIND_REENTRANCE_TICKET ? AuthenticationType.ReentranceTicket : undefined;
    // Reentrance-ticket destinations are ABAP environments on SAP BTP.
    const systemType =
        authenticationType === AuthenticationType.ReentranceTicket ? SystemType.AbapCloud : SystemType.Generic;
    return new BackendSystem({
        name: dest.id,
        url,
        client: dest.properties?.client,
        authenticationType,
        systemType,
        connectionType: ConnectionType.AbapCatalog,
        userDisplayName: dest.properties?.user,
        username: dest.properties?.user,
        source: SystemSource.Adt
    });
}

/**
 * Reads the ADT HTTP destinations as backend systems, keyed by their store id (url[/client]).
 *
 * @param logger - logger for diagnostics
 * @returns a map of id → backend system for all ADT HTTP destinations
 */
export function readAdtSystems(logger: Logger): Record<string, BackendSystem> {
    const result: Record<string, BackendSystem> = {};
    try {
        const file = readDestinationsFile();
        for (const dest of file.destinations ?? []) {
            if (!isHttpSystemDestination(dest)) {
                continue;
            }
            const system = toBackendSystem(dest);
            if (system) {
                result[BackendSystemKey.from(system).getId()] = system;
            }
        }
    } catch (error) {
        logger.error(`Failed to read ADT destinations from ${ADT_DESTINATIONS_FILE}`);
        logger.debug(error instanceof Error ? error.message : String(error));
    }
    return result;
}

/**
 * Writes a backend system back to an HTTP destination in ADT's `destinations.json`, preserving all
 * other (non-HTTP and unrelated) destinations. The destination is matched by store id (url[/client]).
 * A destination for a not-yet-present system is created.
 *
 * @param system - the backend system to persist as an ADT HTTP destination
 * @param logger - logger for diagnostics
 * @returns true if the file was updated
 */
export function writeAdtSystem(system: BackendSystem, logger: Logger): boolean {
    try {
        const file = readDestinationsFile();
        const destinations = file.destinations ?? [];
        const targetId = BackendSystemKey.from(system).getId();

        const authenticationKind =
            system.authenticationType === AuthenticationType.ReentranceTicket ? AUTH_KIND_REENTRANCE_TICKET : undefined;

        // Find the existing HTTP destination whose mapped system id matches.
        const index = destinations.findIndex((dest) => {
            if (!isHttpSystemDestination(dest)) {
                return false;
            }
            const mapped = toBackendSystem(dest);
            return mapped ? BackendSystemKey.from(mapped).getId() === targetId : false;
        });

        const properties: Record<string, string> = {
            systemUrl: system.url,
            ...(system.client ? { client: system.client } : {}),
            ...(system.username ? { user: system.username } : {}),
            ...(authenticationKind ? { authenticationKind } : {})
        };
        const entry: AdtDestination = { id: system.name, protocol: HTTP_PROTOCOL, properties };

        if (index === -1) {
            destinations.push(entry);
        } else {
            // Preserve any additional properties that ADT set but we do not manage.
            entry.properties = { ...destinations[index].properties, ...properties };
            destinations[index] = entry;
        }

        writeFileSync(
            ADT_DESTINATIONS_FILE,
            JSON.stringify({ ...file, formatVersion: file.formatVersion ?? '1.0', destinations }, null, 2)
        );
        return true;
    } catch (error) {
        logger.error(`Failed to write ADT destination to ${ADT_DESTINATIONS_FILE}`);
        logger.debug(error instanceof Error ? error.message : String(error));
        return false;
    }
}

/**
 * Deletes the ADT HTTP destination matching the given system's store id, preserving other entries.
 *
 * @param system - the backend system whose ADT destination should be removed
 * @param logger - logger for diagnostics
 * @returns true if a destination was removed
 */
export function deleteAdtSystem(system: BackendSystem, logger: Logger): boolean {
    try {
        const file = readDestinationsFile();
        const destinations = file.destinations ?? [];
        const targetId = BackendSystemKey.from(system).getId();
        const next = destinations.filter((dest) => {
            if (!isHttpSystemDestination(dest)) {
                return true;
            }
            const mapped = toBackendSystem(dest);
            return mapped ? BackendSystemKey.from(mapped).getId() !== targetId : true;
        });
        if (next.length === destinations.length) {
            return false;
        }
        writeFileSync(ADT_DESTINATIONS_FILE, JSON.stringify({ ...file, destinations: next }, null, 2));
        return true;
    } catch (error) {
        logger.error(`Failed to delete ADT destination from ${ADT_DESTINATIONS_FILE}`);
        logger.debug(error instanceof Error ? error.message : String(error));
        return false;
    }
}
