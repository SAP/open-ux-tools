import type { RequestHandler, NextFunction, Request, Response } from 'express';
import express from 'express';
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

module.exports = async ({ options }: MiddlewareParameters<Ui5MiddlewareConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    });
    const router = express.Router();
    const config = options.configuration;
    const ui5Version = await resolveUI5Version(config.version, logger);
    const secure = !!config.secure;
    const debug = !!config.debug;
    const directLoad = !!config.directLoad;
    const noProxyVal = process.env.no_proxy || process.env.npm_config_noproxy;
    const corporateProxyServer = getCorporateProxyServer(config.proxy);
    // hide user and pass from proxy configuration for displaying it in the terminal
    const proxyInfo = hideProxyCredentials(corporateProxyServer);
    const proxyOptions: Options = {
        secure,
        logLevel: debug ? 'debug' : 'info',
        logProvider: () => {
            return logger;
        }
    };

    logger.info(
        `Starting ui5-proxy-middleware using following configuration:\nproxy: '${proxyInfo}'\nsecure: '${
            secure ? 'true' : 'false'
        }'\ndebug: '${debug ? 'true' : 'false'}''\ndebug: '${directLoad ? 'true' : 'false'}'`
    );

    const configs = Array.isArray(config.ui5) ? config.ui5 : [config.ui5];
    const ui5Configs: ProxyConfig[] = [];
    for (const ui5 of configs) {
        const paths = Array.isArray(ui5.path) ? ui5.path : [ui5.path];
        for (const ui5Path of paths) {
            const ui5Config: ProxyConfig = {
                path: ui5Path,
                url: ui5.url,
                version: ui5Version
            };
            if (corporateProxyServer && !isHostExcludedFromProxy(noProxyVal, ui5Config.url)) {
                proxyOptions.agent = new HttpsProxyAgent(corporateProxyServer);
            }
            router.use(ui5Config.path, ui5Proxy(ui5Config, proxyOptions));
            ui5Configs.push(ui5Config);
        }
    }

    if (directLoad) {
        router.use(HTML_MOUNT_PATHS, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            await injectScripts(req, res, next, ui5Configs);
        });
    }

    return router;
};
