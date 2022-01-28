import express, { RequestHandler, NextFunction, Request, Response } from 'express';
import { Options } from 'http-proxy-middleware';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import {
    getCorporateProxyServer,
    HTML_MOUNT_PATHS,
    injectUI5Url,
    isHostExcludedFromProxy,
    MiddlewareParameters,
    ProxyConfig,
    ui5Proxy,
    setUI5Version
} from '../base';

module.exports = async ({ options }: MiddlewareParameters<ProxyConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    });
    const router = express.Router();
    const config = options.configuration;
    const ui5Version = await setUI5Version(config.version, logger);
    const secure = !!config.secure;
    const debug = !!config.debug;
    const directLoad = !!config.directLoad;
    const noProxyVal = process.env.no_proxy || process.env.npm_config_noproxy;
    const corporateProxyServer = getCorporateProxyServer(config.proxy);
    // hide user and pass from proxy configuration for displaying it in the terminal
    const proxyInfo = corporateProxyServer
        ? corporateProxyServer.replace(/\/\/(.*:{0,1}.*@)/, '//***:***@')
        : corporateProxyServer;
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
        }'\ndebug: '${debug ? 'true' : 'false'}'`
    );

    for (const ui5Config of config.ui5) {
        ui5Config.version = ui5Version;
        if (corporateProxyServer && !isHostExcludedFromProxy(noProxyVal, ui5Config.url)) {
            proxyOptions.agent = new HttpsProxyAgent(corporateProxyServer);
        }
        router.use(ui5Config.path, ui5Proxy(ui5Config, proxyOptions));
    }

    if (directLoad) {
        router.use(HTML_MOUNT_PATHS, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            await injectUI5Url(req, res, next, config.ui5);
        });
    }

    return router;
};
