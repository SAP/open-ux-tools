import type { RequestHandler, NextFunction, Request, Response } from 'express';
import type { Options } from 'http-proxy-middleware';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { MiddlewareParameters, Ui5MiddlewareConfig, ProxyConfig } from '../base';
import {
    getCorporateProxyServer,
    HTML_MOUNT_PATHS,
    injectScripts,
    isHostExcludedFromProxy,
    ui5Proxy,
    resolveUI5Version,
    hideProxyCredentials
} from '../base';
import dotenv from 'dotenv';

module.exports = async ({ options }: MiddlewareParameters<Ui5MiddlewareConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    });
    dotenv.config();
    const config = options.configuration;
    const ui5Version = await resolveUI5Version(config.version, logger);
    const envUI5Url = process.env.FIORI_TOOLS_UI5_URI;
    const secure = config.secure !== undefined ? !!config.secure : true;
    const debug = !!config.debug;
    const directLoad = !!config.directLoad;
    const noProxyVal = process.env.no_proxy || process.env.npm_config_noproxy;
    const corporateProxyServer = getCorporateProxyServer(config.proxy);
    // hide user and pass from proxy configuration for displaying it in the terminal
    const proxyInfo = hideProxyCredentials(corporateProxyServer);
    const proxyOptions: Options = {
        secure,
        logLevel: debug ? 'debug' : 'info',
        logProvider: () => logger
    };

    logger.info(
        `Starting ui5-proxy-middleware using following configuration:\nproxy: '${proxyInfo}'\nsecure: '${secure}'\ndebug: '${debug}''\ndirectLoad: '${directLoad}'`
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
                version: ui5Version
            };
            if (corporateProxyServer && !isHostExcludedFromProxy(noProxyVal, ui5Config.url)) {
                proxyOptions.agent = new HttpsProxyAgent(corporateProxyServer);
            }
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

    return (req, res, next) => {
        for (const route of routes) {
            if (req.path.startsWith(route.route)) {
                return route.handler(req, res, next);
            }
        }
        next();
    };
};
