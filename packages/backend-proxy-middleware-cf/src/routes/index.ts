import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import type { ApprouterDestination } from '../types';
import type { EffectiveOptions, RouteEntry, XsappConfig } from '../config';

/** Options for loading xs-app.json and building route entries */
export interface LoadXsappAndBuildRoutesOptions {
    rootPath: string;
    xsappJsonPath: string;
    effectiveOptions: EffectiveOptions;
    sourcePath: string;
    logger: ToolsLogger;
    destinations: ApprouterDestination[] | undefined;
}

/**
 * Load xs-app.json and build the list of route entries (with compiled regex and destination URLs).
 *
 * @param {LoadXsappAndBuildRoutesOptions} options - Options object (rootPath, xsappJsonPath, effectiveOptions, sourcePath, logger, destinations).
 * @returns {{ xsappConfig: XsappConfig; routes: RouteEntry[] }} xsappConfig (mutated with filtered routes) and routes array.
 */
export function loadXsappAndBuildRoutes(options: LoadXsappAndBuildRoutesOptions): {
    xsappConfig: XsappConfig;
    routes: RouteEntry[];
} {
    const { rootPath, xsappJsonPath, effectiveOptions, sourcePath, logger, destinations } = options;
    const xsappConfig = JSON.parse(fs.readFileSync(xsappJsonPath, 'utf8')) as XsappConfig;

    if (effectiveOptions.disableWelcomeFile) {
        delete xsappConfig.welcomeFile;
    }

    xsappConfig.authenticationMethod = effectiveOptions.authenticationMethod;

    const routes: RouteEntry[] = [];
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
            source: '^/([^.]+\\.html?(?:\\?.*)?)$',
            localDir: relativeSourcePath,
            target: '$1',
            cacheControl: 'no-store',
            authenticationType: 'xsuaa'
        });
    }

    const destList = Array.isArray(destinations) ? destinations : [];
    for (const route of xsappConfig.routes) {
        if (xsappConfig.authenticationMethod?.toLowerCase() === 'none') {
            route.authenticationType = 'none';
        }
        const routeMatch = route.source.match(/[^/]*\/(.*\/)?[^/]*/);
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

    return { xsappConfig, routes };
}
