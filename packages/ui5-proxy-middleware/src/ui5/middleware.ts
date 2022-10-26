import type { RequestHandler, NextFunction, Request, Response } from 'express';
import type { Options } from 'http-proxy-middleware';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { MiddlewareParameters, Ui5MiddlewareConfig, ProxyConfig } from '../base';
import {
    getCorporateProxyServer,
    HTML_MOUNT_PATHS,
    injectScripts,
    ui5Proxy,
    resolveUI5Version,
    hideProxyCredentials
} from '../base';
import dotenv from 'dotenv';
import type { UI5ProxyConfig } from '@sap-ux/ui5-config';

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
    return (req, res, next): void => {
        for (const route of routes) {
            if (req.path.startsWith(route.route)) {
                route.handler(req, res, next);
                return;
            }
        }
        next();
    };
}

module.exports = async ({ options }: MiddlewareParameters<Ui5MiddlewareConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    });
    dotenv.config();
    const config = options.configuration;
    const ui5Version = await resolveUI5Version(config.version, logger);
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
        const directLoadProxy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            await injectScripts(req, res, next, ui5Configs);
        };

        HTML_MOUNT_PATHS.forEach((path) => {
            routes.push({ route: path, handler: directLoadProxy });
        });
    }

    return createRequestHandler(routes);
};
