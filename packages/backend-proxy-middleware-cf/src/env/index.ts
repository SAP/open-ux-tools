import fs from 'node:fs';
import path from 'node:path';

import type { ApprouterDestination } from '../types';

/**
 * Set or clear process.env.destinations for the approuter.
 * When destinations is a non-empty array, sets process.env.destinations to its JSON string; otherwise removes it.
 *
 * @param destinations - Resolved destinations array or undefined.
 */
export function applyDestinationsToEnv(destinations: ApprouterDestination[] | undefined): void {
    if (Array.isArray(destinations) && destinations.length > 0) {
        process.env.destinations = JSON.stringify(destinations);
    } else {
        delete process.env.destinations;
    }
}

/**
 * Load the env options JSON file and apply its top-level keys to process.env.
 * Spreads the whole object then overwrites "destinations" and "VCAP_SERVICES" with JSON-stringified values.
 * The key "destinations" is then removed so the middleware's destinations config takes precedence.
 *
 * @param rootPath - Project root path.
 * @param envOptionsPath - Path to the env options file (relative to rootPath).
 * @throws {Error} If the file is missing or invalid JSON.
 */
export function loadAndApplyEnvOptions(rootPath: string, envOptionsPath: string): void {
    const resolvedPath = path.resolve(rootPath, envOptionsPath);
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Env options file not found at "${resolvedPath}" (envOptionsPath: "${envOptionsPath}").`);
    }

    let options: Record<string, unknown>;
    try {
        const content = fs.readFileSync(resolvedPath, 'utf8');
        options = JSON.parse(content) as Record<string, unknown>;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to read env options from "${resolvedPath}": ${message}.`);
    }

    const envOptions = {
        ...options,
        ...(options.destinations ? { destinations: JSON.stringify(options.destinations) } : {}),
        ...(options.VCAP_SERVICES ? { VCAP_SERVICES: JSON.stringify(options.VCAP_SERVICES) } : {})
    };
    process.env = Object.assign(process.env, envOptions);
}
