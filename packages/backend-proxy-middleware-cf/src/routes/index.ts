import fs from 'node:fs';
import path from 'node:path';

import type { BuildRouteEntriesOptions, PrepareXsappConfigOptions, RouteEntry, XsappConfig } from '../types';

/**
 * Load xs-app.json and prepare it for the approuter (filter routes, set auth, optionally append auth route).
 * Mutates and returns the config; does not build RouteEntry[].
 *
 * @param {PrepareXsappConfigOptions} options - rootPath, xsappJsonPath, effectiveOptions, sourcePath.
 * @returns {XsappConfig} The loaded and mutated XsappConfig.
 */
export function loadAndPrepareXsappConfig(options: PrepareXsappConfigOptions): XsappConfig {
    const { rootPath, xsappJsonPath, effectiveOptions, sourcePath } = options;
    const xsappConfig = JSON.parse(fs.readFileSync(xsappJsonPath, 'utf8')) as XsappConfig;

    if (effectiveOptions.disableWelcomeFile) {
        delete xsappConfig.welcomeFile;
    }

    xsappConfig.authenticationMethod = effectiveOptions.authenticationMethod;

    const xsappRoutes = xsappConfig.routes ?? [];
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- boolean OR for route inclusion */
    xsappConfig.routes = xsappRoutes.filter((route) => {
        return (
            (effectiveOptions.allowLocalDir || !route.localDir) && (effectiveOptions.allowServices || !route.service)
        );
    });

    if (
        effectiveOptions.appendAuthRoute &&
        effectiveOptions.authenticationMethod &&
        effectiveOptions.authenticationMethod !== 'none'
    ) {
        const relativeSourcePath = path.relative(rootPath, sourcePath);
        xsappConfig.routes.push({
            source: String.raw`^/([^.]+\\.html?(?:\?.*)?)$`,
            localDir: relativeSourcePath,
            target: '$1',
            cacheControl: 'no-store',
            authenticationType: 'xsuaa'
        });
    }

    if (xsappConfig.authenticationMethod?.toLowerCase() === 'none') {
        for (const route of xsappConfig.routes) {
            route.authenticationType = 'none';
        }
    }

    return xsappConfig;
}

/**
 * Build the list of route entries (compiled regex + resolved destination URLs) from a prepared xsappConfig.
 * Does not read files or mutate xsappConfig.
 *
 * @param {BuildRouteEntriesOptions} options - xsappConfig, destinations, effectiveOptions, logger.
 * @returns {RouteEntry[]} Route entries for the proxy.
 */
export function buildRouteEntries(options: BuildRouteEntriesOptions): RouteEntry[] {
    const { xsappConfig, destinations, effectiveOptions, logger } = options;
    const routes: RouteEntry[] = [];
    const destList = Array.isArray(destinations) ? destinations : [];

    for (const route of xsappConfig.routes ?? []) {
        const routeMatch = /[^/]*\/(.*\/)?[^/]*/.exec(route.source);
        if (routeMatch) {
            const url = destList.find((d) => d.name === route.destination)?.url;
            routes.push({
                ...route,
                re: new RegExp(route.source),
                path: routeMatch[1],
                url
            });
            if (effectiveOptions.debug) {
                logger.debug(
                    `Adding destination "${route.destination ?? route.endpoint ?? ''}" proxying to ${route.source}`
                );
            }
        }
    }

    return routes;
}
