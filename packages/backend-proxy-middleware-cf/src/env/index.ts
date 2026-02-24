import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import type { AppRouterEnvOptions } from '@sap-ux/adp-tooling';
import { buildVcapServicesFromResources, getSpaceGuidFromUi5Yaml, getYamlContent } from '@sap-ux/adp-tooling';

import type { EffectiveOptions } from '../types';

/**
 * Load and parse env options JSON file.
 *
 * @param {string} rootPath - Project root path.
 * @param {string} envOptionsPath - Path to file (relative to rootPath).
 * @returns {AppRouterEnvOptions} Parsed options object.
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
 * @param {AppRouterEnvOptions} options - Env options to apply.
 */
function applyToProcessEnv(options: AppRouterEnvOptions): void {
    const envOptions = {
        ...options,
        ...(options.destinations ? { destinations: JSON.stringify(options.destinations) } : {}),
        ...(options.VCAP_SERVICES ? { VCAP_SERVICES: JSON.stringify(options.VCAP_SERVICES) } : {})
    };
    process.env = Object.assign(process.env, envOptions);
}

/**
 * Load env options from file or CF, apply to process.env, and add destinations from effectiveOptions.
 *
 * When effectiveOptions.envOptionsPath is set, loads that JSON file. When null, loads mta.yaml one level
 * above rootPath and fetches VCAP_SERVICES from CF. effectiveOptions.destinations is applied so
 * middleware config takes precedence over file/env.
 *
 * @param {string} rootPath - Project root path.
 * @param {EffectiveOptions} effectiveOptions - Merged config; envOptionsPath and destinations are used.
 * @param {ToolsLogger} logger - Logger for CF path.
 * @returns {Promise<void>} Promise resolving when env options are loaded and applied.
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
