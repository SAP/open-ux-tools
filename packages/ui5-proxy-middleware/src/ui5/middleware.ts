import type { RequestHandler, NextFunction, Request, Response } from 'express';
import { Router as createRouter } from 'express';
import type { Options } from 'http-proxy-middleware';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { ProxyConfig } from '../base';
import { getCorporateProxyServer, injectScripts, ui5Proxy, resolveUI5Version, hideProxyCredentials } from '../base';
import dotenv from 'dotenv';
import type { UI5ProxyConfig } from '@sap-ux/ui5-config';
import type { Manifest } from '@sap-ux/project-access';
import type { MiddlewareParameters } from '@ui5/server';
import type { ReaderCollection } from '@ui5/fs';

/**
 * Create proxy options based on the middleware config.
 *
 * @param logger logger to be used when running the middleware
 * @param config middleware configuration
 * @returns options object
 */
function createProxyOptions(logger: ToolsLogger, config: UI5ProxyConfig): Options {
    return {
        secure: config.secure !== undefined ? !!config.secure : true,
        logLevel: config.debug ? 'debug' : 'info',
        logProvider: () => logger
    };
}

/**
 * Creates a function handling the routes the need to be rerouted to a UI5 provider.
 *
 * @param routes routes that need to be handled
 * @returns handler function
 */
function createRequestHandler(routes: { route: string; handler: RequestHandler }[]): RequestHandler {
    const router = createRouter();
    for (const route of routes) {
        router.get(`${route.route}*`, route.handler);
    }
    return router;
}

/**
 * Search the project for the manifest.json.
 *
 * @param rootProject @ui5/fs reader collection with access to the project files
 * @returns manifest.json as object or undefined if not found
 */
async function loadManifest(rootProject: ReaderCollection): Promise<Manifest | undefined> {
    const files = await rootProject.byGlob('**/manifest.json');
    if (files?.length > 0) {
        return JSON.parse(await files[0].getString());
    } else {
        return undefined;
    }
}

module.exports = async ({ resources, options }: MiddlewareParameters<UI5ProxyConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    });

    dotenv.config();
    const config: UI5ProxyConfig = {
        ui5: {
            path: ['/resources', '/test-resources'],
            url: 'https://ui5.sap.com'
        },
        ...options.configuration
    };
    let ui5Version: string = '';
    try {
        const manifest = await loadManifest(resources.rootProject);
        ui5Version = await resolveUI5Version(config.version, logger, manifest);
    } catch (error) {
        logger.warn('Retrieving UI5 version failed, using latest version instead.');
        logger.debug(error);
    }

    const envUI5Url = process.env.FIORI_TOOLS_UI5_URI;
    const directLoad = !!config.directLoad;
    const corporateProxyServer = getCorporateProxyServer(config.proxy);
    // hide user and pass from proxy configuration for displaying it in the terminal
    const proxyInfo = hideProxyCredentials(corporateProxyServer);
    const proxyOptions = createProxyOptions(logger, config);

    logger.info(
        `Starting ui5-proxy-middleware using following configuration:\nproxy: '${proxyInfo}'\nsecure: '${proxyOptions.secure}'\nlog: '${proxyOptions.logLevel}''\ndirectLoad: '${directLoad}'`
    );

    const configs = Array.isArray(config.ui5) ? config.ui5 : [config.ui5];
    const ui5Configs: ProxyConfig[] = [];
    const routes: { route: string; handler: RequestHandler }[] = [];
    for (const ui5 of configs) {
        const paths = Array.isArray(ui5.path) ? ui5.path : [ui5.path];
        for (const ui5Path of paths) {
            const ui5Config: ProxyConfig = {
                path: ui5Path,
                url: envUI5Url || ui5.url,
                version: ui5Version,
                proxy: config.proxy
            };

            routes.push({ route: ui5Config.path, handler: ui5Proxy(ui5Config, proxyOptions) });
            ui5Configs.push(ui5Config);
        }
    }

    if (directLoad) {
        const directLoadProxy = (async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                await injectScripts(req, res, next, ui5Configs, resources.rootProject);
            } catch (error) {
                logger.error(error);
                next(error);
            }
        }) as RequestHandler;

        routes.push({ route: '*.html', handler: directLoadProxy });
    }

    return createRequestHandler(routes);
};
