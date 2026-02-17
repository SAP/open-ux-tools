import portfinder from 'portfinder';

import type { ToolsLogger } from '@sap-ux/logger';

import type { EffectiveOptions } from '../types';
import type { ApprouterDestination } from '../types';

/**
 * Parse destinations from process.env.destinations JSON string.
 *
 * @returns {ApprouterDestination[] | undefined} Parsed destinations or undefined if missing/invalid.
 */
export function parseDestinationsFromEnv(): ApprouterDestination[] | undefined {
    try {
        const envDest = process.env.destinations;
        if (envDest) {
            return JSON.parse(envDest) as ApprouterDestination[];
        }
    } catch {
        // process.env.destinations missing or invalid JSON
    }
    return undefined;
}

/**
 * Resolve destinations from config: process.env.destinations, $env:VAR, or array.
 *
 * @param {EffectiveOptions} effectiveOptions - Merged configuration options.
 * @returns {ApprouterDestination[] | undefined} Resolved destinations array or undefined.
 */
export function resolveDestinations(effectiveOptions: EffectiveOptions): ApprouterDestination[] | undefined {
    let destinations = parseDestinationsFromEnv();
    if (!destinations) {
        const destOpt = effectiveOptions.destinations;
        if (typeof destOpt === 'string' && destOpt.startsWith('$env:')) {
            const key = destOpt.substring(5).trim();
            if (key && key in process.env) {
                try {
                    destinations = JSON.parse(process.env[key]!) as ApprouterDestination[];
                } catch (error) {
                    throw new Error(`No valid destinations JSON in .env at '${key}': ${String(error)}`);
                }
            } else {
                throw new Error(`No variable for 'destinations' with name '${key}' found in process.env.`);
            }
        } else if (Array.isArray(destOpt)) {
            destinations = destOpt;
        }
    }
    return destinations;
}

/**
 * Returns the next free port starting from basePort.
 *
 * @param basePort - Base port to start searching from.
 * @param logger - Optional logger to warn if portfinder fails and basePort is used.
 * @returns A free port number.
 */
export async function nextFreePort(basePort: number, logger?: ToolsLogger): Promise<number> {
    try {
        portfinder.basePort = basePort;
        return await portfinder.getPortPromise();
    } catch {
        logger?.warn(`portfinder failed, using base port ${basePort}.`);
        return basePort;
    }
}
