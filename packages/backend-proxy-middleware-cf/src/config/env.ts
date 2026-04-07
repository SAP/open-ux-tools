import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import type { AppRouterEnvOptions } from '@sap-ux/adp-tooling';
import { buildVcapServicesFromResources, getSpaceGuidFromUi5Yaml, getYamlContent } from '@sap-ux/adp-tooling';

import type { EffectiveOptions } from '../types';
import { UI5_SERVER_DESTINATION } from './constants';

/**
 * Destination entry as stored in process.env.destinations.
 */
interface EnvDestination {
    name: string;
    url: string;
}

/**
 * Load and parse env options JSON file.
 *
 * @param rootPath - Project root path.
 * @param envOptionsPath - Path to file (relative to rootPath).
 * @returns Parsed options object.
 */
function loadEnvOptionsFromFile(rootPath: string, envOptionsPath: string): AppRouterEnvOptions {
    const resolvedPath = path.resolve(rootPath, envOptionsPath);
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Env options file not found at "${resolvedPath}" (envOptionsPath: "${envOptionsPath}").`);
    }

    try {
        const content = fs.readFileSync(resolvedPath, 'utf8');
        return JSON.parse(content) as AppRouterEnvOptions;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to read env options from "${resolvedPath}": ${message}.`);
    }
}

/**
 * Apply options to process.env with JSON-stringified destinations and VCAP_SERVICES.
 *
 * @param options - Env options to apply.
 */
function applyToProcessEnv(options: AppRouterEnvOptions): void {
    const envOptions = {
        ...options,
        ...(options.destinations ? { destinations: JSON.stringify(options.destinations) } : {}),
        ...(options.VCAP_SERVICES ? { VCAP_SERVICES: JSON.stringify(options.VCAP_SERVICES) } : {})
    };
    Object.assign(process.env, envOptions);
}

/**
 * Load env options from file or CF, apply to process.env, and add destinations from effectiveOptions.
 *
 * When effectiveOptions.envOptionsPath is set, loads that JSON file. When null, loads mta.yaml one level
 * above rootPath and fetches VCAP_SERVICES from CF. effectiveOptions.destinations is applied so
 * middleware config takes precedence over file/env.
 *
 * @param rootPath - Project root path.
 * @param effectiveOptions - Merged config; envOptionsPath and destinations are used.
 * @param logger - Logger for CF path.
 * @returns Promise resolving when env options are loaded and applied.
 */
export async function loadAndApplyEnvOptions(
    rootPath: string,
    effectiveOptions: EffectiveOptions,
    logger: ToolsLogger
): Promise<void> {
    const { envOptionsPath, destinations: middlewareDestinations } = effectiveOptions;
    let options: AppRouterEnvOptions;

    if (envOptionsPath) {
        const envOptions = loadEnvOptionsFromFile(rootPath, envOptionsPath);
        const destinations = envOptions.destinations
            ? [...envOptions.destinations, ...middlewareDestinations]
            : middlewareDestinations;
        options = { ...envOptions, destinations };
    } else {
        const mtaPath = path.resolve(rootPath, '..', 'mta.yaml');
        const spaceGuid = await getSpaceGuidFromUi5Yaml(rootPath, logger);

        if (!spaceGuid) {
            throw new Error('No space GUID (from config or ui5.yaml). Cannot load CF env options.');
        }

        if (!fs.existsSync(mtaPath)) {
            throw new Error(`mta.yaml not found at "${mtaPath}". Cannot load CF env options.`);
        }

        const mtaYaml = getYamlContent(mtaPath);
        const VCAP_SERVICES = await buildVcapServicesFromResources(mtaYaml.resources, spaceGuid, logger);
        options = {
            VCAP_SERVICES,
            destinations: middlewareDestinations
        };
    }

    applyToProcessEnv(options);
}

/**
 * Ensure the ui5-server destination exists and has the correct URL.
 * If ui5-server doesn't exist in configuration, it will be auto-created.
 * If it exists but has a different port, it will be updated.
 * In BAS, the external URL is used instead of localhost so the approuter
 * builds correct redirect URIs.
 *
 * This enables multi-instance support and removes the need to manually
 * configure ui5-server in ui5.yaml - it's auto-configured based on the actual port.
 *
 * @param effectiveOptions - Merged options containing destinations.
 * @param actualPort - The actual port detected from the incoming request.
 * @param basExternalUrl - Optional BAS external URL; when set, used as the destination URL.
 * @returns True if destination was created or updated, false if no change needed.
 */
export function updateUi5ServerDestinationPort(
    effectiveOptions: EffectiveOptions,
    actualPort: number,
    basExternalUrl?: URL
): boolean {
    const newUrl = basExternalUrl ? basExternalUrl.href : `http://localhost:${actualPort}`;

    let ui5ServerDest = effectiveOptions.destinations.find((d) => d.name === UI5_SERVER_DESTINATION);

    if (!ui5ServerDest) {
        ui5ServerDest = { name: UI5_SERVER_DESTINATION, url: newUrl };
        effectiveOptions.destinations.push(ui5ServerDest);

        const envDestinations = JSON.parse(process.env.destinations ?? '[]') as EnvDestination[];
        envDestinations.push({ name: UI5_SERVER_DESTINATION, url: newUrl });
        process.env.destinations = JSON.stringify(envDestinations);

        return true;
    }

    const currentUrl = new URL(ui5ServerDest.url);
    const currentPort = Number.parseInt(currentUrl.port, 10) || 80;
    if (currentPort === actualPort) {
        return false;
    }

    ui5ServerDest.url = newUrl;

    const envDestinations = JSON.parse(process.env.destinations ?? '[]') as EnvDestination[];
    const envUi5ServerDest = envDestinations.find((d) => d.name === UI5_SERVER_DESTINATION);
    if (envUi5ServerDest) {
        envUi5ServerDest.url = newUrl;
    } else {
        envDestinations.push({ name: UI5_SERVER_DESTINATION, url: newUrl });
    }
    process.env.destinations = JSON.stringify(envDestinations);

    return true;
}
