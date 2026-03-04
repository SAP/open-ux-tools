import fs from 'node:fs';
import path from 'node:path';

import type {
    BuildRouteEntriesOptions,
    PrepareXsappConfigOptions,
    RouteEntry,
    XsappConfig,
    XsappRoute
} from '../types';
import { UI5_SERVER_DESTINATION } from '../constants';

/**
 * Auth route for HTML pages - triggers XSUAA login.
 * Only this route is needed; /resources and /test-resources are handled
 * directly by ui5-proxy-middleware without going through approuter.
 */
const UI5_SERVER_AUTH_ROUTE: XsappRoute = {
    source: String.raw`^/(test|local)/.*\.html.*$`,
    destination: UI5_SERVER_DESTINATION,
    authenticationType: 'xsuaa'
};

/**
 * Load xs-app.json and prepare it for the approuter (filter routes, set auth, optionally append auth route).
 * Mutates and returns the config; does not build RouteEntry[].
 *
 * @param options - rootPath, xsappJsonPath, effectiveOptions, sourcePath.
 * @returns The loaded and mutated XsappConfig.
 */
export function loadAndPrepareXsappConfig(options: PrepareXsappConfigOptions): XsappConfig {
    const { rootPath, xsappJsonPath, effectiveOptions, sourcePath } = options;
    const xsappConfig = JSON.parse(fs.readFileSync(xsappJsonPath, 'utf8')) as XsappConfig;

    if (effectiveOptions.disableWelcomeFile) {
        delete xsappConfig.welcomeFile;
    }

    xsappConfig.authenticationMethod = effectiveOptions.authenticationMethod;

    const xsappRoutes = xsappConfig.routes ?? [];
    xsappConfig.routes = xsappRoutes.filter((route) => {
        return (
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- boolean OR for route inclusion
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

    if (!effectiveOptions.disableUi5ServerRoutes) {
        // Inject only the HTML auth route - /resources and /test-resources
        // are handled directly by ui5-proxy-middleware without approuter loop
        xsappConfig.routes.push(UI5_SERVER_AUTH_ROUTE);
    }

    return xsappConfig;
}

/**
 * Build the list of route entries (compiled regex + resolved destination URLs) from a prepared xsappConfig.
 * Does not read files or mutate xsappConfig.
 *
 * @param options - xsappConfig, effectiveOptions, logger.
 * @returns Route entries for the proxy.
 */
export function buildRouteEntries(options: BuildRouteEntriesOptions): RouteEntry[] {
    const { xsappConfig, effectiveOptions, logger } = options;
    const routes: RouteEntry[] = [];
    const destList = Array.isArray(effectiveOptions.destinations) ? effectiveOptions.destinations : [];

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
                const destination = route.destination ?? route.endpoint ?? '';
                logger.debug(`Adding destination "${destination}" proxying to ${route.source}`);
            }
        }
    }

    return routes;
}
