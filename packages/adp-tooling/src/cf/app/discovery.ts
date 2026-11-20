import type AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n.js';
import { extractXSApp } from '../utils/index.js';
import {
    getAdaptableBusinessServices,
    getAdpServiceInstances,
    getBusinessServiceInfo,
    getFDCApps,
    getSapCloudServiceName
} from '../services/api.js';
import type { CfConfig, CfServiceInstanceChoice, CFApp, ServiceKeys, XsApp } from '../../types.js';

/**
 * Get the app host ids from service keys.
 *
 * @param {ServiceKeys[]} serviceKeys - The service keys.
 * @returns {string[]} The app host ids.
 */
export function getAppHostIds(serviceKeys: ServiceKeys[]): string[] {
    const appHostIds: string[] = [];

    for (const serviceKey of serviceKeys) {
        const appHostId = serviceKey.credentials['html5-apps-repo']?.app_host_id;
        if (appHostId) {
            // There might be multiple appHostIds separated by comma
            const ids = appHostId.split(',').map((item: string) => item.trim());
            appHostIds.push(...ids);
        }
    }

    return [...new Set(appHostIds)];
}

/**
 * Extracts all backend URLs from service key credentials. Iterates through all endpoint keys to find all endpoints with URLs.
 * Handles both string endpoints and object endpoints with url property.
 *
 * @param {ServiceKeys[]} serviceKeys - The credentials from service keys.
 * @returns {string[]} Array of backend URLs (including full paths) or empty array if none found.
 */
export function getBackendUrlsFromServiceKeys(serviceKeys: ServiceKeys[]): string[] {
    if (!serviceKeys || serviceKeys.length === 0) {
        return [];
    }

    const urls: string[] = [];
    const endpoints = serviceKeys[0]?.credentials?.endpoints as Record<string, { url?: string }> | undefined;
    if (endpoints && typeof endpoints === 'object' && endpoints !== null) {
        for (const key in endpoints) {
            const endpoint = endpoints[key];
            if (endpoint?.url) {
                urls.push(endpoint.url);
            }
        }
    }

    return urls;
}

/**
 * Clean regex pattern from route source.
 *
 * @param {string} source - The route source pattern.
 * @returns {string} Cleaned path.
 */
function cleanRoutePath(source: string): string {
    let path = source;
    // Remove leading ^ and trailing $
    path = path.replace(/^\^/, '').replace(/\$$/, '');
    // Remove capture groups like (.*) or $1
    path = path.replace(/\([^)]*\)/g, '');
    // Remove regex quantifiers
    path = path.replace(/\$\d+/g, '');
    // Clean up any remaining regex characters at the end
    path = path.replace(/\/?\*$/, '');
    // Normalize multiple consecutive slashes to single slash
    while (path.includes('//')) {
        path = path.replaceAll('//', '/');
    }
    // Remove trailing slash to ensure proper path matching
    path = path.replace(/\/$/, '');
    return path;
}

/**
 * Extract endpoint destinations from service keys.
 *
 * @param {ServiceKeys[]} serviceKeys - The service keys.
 * @returns {Array<{name: string; url: string}>} Array of endpoint destinations.
 */
export function getServiceKeyDestinations(serviceKeys: ServiceKeys[]): Array<{ name: string; url: string }> {
    const endpointDestinations: Array<{ name: string; url: string }> = [];

    for (const key of serviceKeys) {
        const endpoints = key.credentials?.endpoints;
        if (endpoints && typeof endpoints === 'object') {
            for (const endpointKey in endpoints) {
                const endpoint = endpoints[endpointKey];
                if (endpoint?.url && endpoint.destination) {
                    endpointDestinations.push({
                        name: endpoint.destination,
                        url: endpoint.url
                    });
                }
            }
        }
    }

    return endpointDestinations;
}

/**
 * Extracts OAuth paths from xs-app.json routes that have a source property.
 * These paths should receive OAuth Bearer tokens in the middleware.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries containing xs-app.json.
 * @returns {string[]} Array of path patterns (from route.source) that have a source property.
 */
export function getOAuthPathsFromXsApp(zipEntries: AdmZip.IZipEntry[]): string[] {
    const xsApp: XsApp | undefined = extractXSApp(zipEntries);
    if (!xsApp?.routes) {
        return [];
    }

    const pathsSet = new Set<string>();
    for (const route of xsApp.routes) {
        if (route.service === 'html5-apps-repo-rt' || !route.source) {
            continue;
        }

        const path = cleanRoutePath(route.source);
        if (path) {
            pathsSet.add(path);
        }
    }

    return Array.from(pathsSet);
}

/**
 * Discover apps from FDC API based on credentials.
 *
 * @param {ServiceKeys[]} serviceKeys - The service keys containing app host IDs
 * @param {CfConfig} cfConfig - The CF configuration
 * @param {ToolsLogger} logger - The logger
 * @returns {Promise<CFApp[]>} The discovered apps
 */
export async function getCfApps(serviceKeys: ServiceKeys[], cfConfig: CfConfig, logger: ToolsLogger): Promise<CFApp[]> {
    const appHostIds = getAppHostIds(serviceKeys);
    logger?.log(`App Host Ids: ${JSON.stringify(appHostIds)}`);

    // Validate appHostIds array length (max 100 as per API specification)
    if (appHostIds.length > 100) {
        throw new Error(t('error.tooManyAppHostIds', { appHostIdsLength: appHostIds.length }));
    }

    return getFDCApps(appHostIds, cfConfig, logger);
}

/**
 * Finds every live managed service instance in the current CF space whose apps include one with the
 * given `appId`. The caller decides what to do with the result (none/one/many) — this stays policy-free.
 *
 * The lookup first narrows the candidates with a read-only pre-filter: it resolves each instance's
 * `sap.cloud.service` name from its existing service key (via {@link getSapCloudServiceName}, which
 * never creates a key) and asks FDC which of those services expose adaptable apps (via
 * {@link getAdaptableBusinessServices}). Only the surviving candidates are resolved with
 * {@link getBusinessServiceInfo} — which may create a service key — so keys are never created on
 * unrelated instances. A failure while probing a single instance is logged and skipped rather than
 * aborting the whole search.
 *
 * Blind spot (matches the interactive picker): an adaptable instance that has never had a service key
 * created resolves to no `sap.cloud.service` name and is therefore excluded, even if it exposes the app.
 *
 * @param {string} appId - The base application id to search for (matched against `CFApp.appId`).
 * @param {CfConfig} cfConfig - The CF configuration (must have a space GUID; caller ensures login first).
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<CfServiceInstanceChoice[]>} The matching service instances (possibly empty).
 */
export async function findServiceInstancesForApp(
    appId: string,
    cfConfig: CfConfig,
    logger: ToolsLogger
): Promise<CfServiceInstanceChoice[]> {
    const instances = await getAdpServiceInstances(cfConfig.space.GUID, logger);
    if (instances.length === 0) {
        return [];
    }

    // Read-only pre-filter: resolve each instance's business-service name from its existing key.
    const cloudServiceNameByGuid = new Map<string, string>();
    await Promise.all(
        instances.map(async (instance) => {
            try {
                const name = await getSapCloudServiceName(instance.guid, logger);
                if (name) {
                    cloudServiceNameByGuid.set(instance.guid, name);
                }
            } catch (error) {
                logger?.warn(`Failed to resolve business service for instance '${instance.name}': ${error}`);
            }
        })
    );

    const adaptable = await getAdaptableBusinessServices([...cloudServiceNameByGuid.values()], cfConfig, logger);
    const candidates = instances.filter((instance) => {
        const name = cloudServiceNameByGuid.get(instance.guid);
        return name !== undefined && adaptable.has(name);
    });

    const matches: CfServiceInstanceChoice[] = [];
    for (const instance of candidates) {
        try {
            const serviceInfo = await getBusinessServiceInfo(instance.name, cfConfig, logger);
            if (!serviceInfo) {
                continue;
            }
            const apps = await getCfApps(serviceInfo.serviceKeys, cfConfig, logger);
            if (apps.some((app) => app.appId === appId)) {
                matches.push(instance);
            }
        } catch (error) {
            logger?.warn(`Failed to inspect apps for service instance '${instance.name}': ${error}`);
        }
    }

    return matches;
}
