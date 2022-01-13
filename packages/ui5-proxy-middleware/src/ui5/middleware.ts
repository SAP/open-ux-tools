import express, { RequestHandler } from 'express';
import { MiddlewareParameters, ProxyConfig } from '../base/types';
import { ui5Proxy } from '../base/proxy';
import { getCorporateProxyServer, isHostExcludedFromProxy } from '../base/utils';
import { Options } from 'http-proxy-middleware';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ToolsLogger } from '@sap-ux/logger';
import { UI5ToolingTransport } from '@sap-ux/logger/dist/transports';

module.exports = ({ options }: MiddlewareParameters<ProxyConfig>): RequestHandler => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    });
    const router = express.Router();
    const config = options.configuration;
    const secure = !!config.secure;
    const debug = !!config.debug;
    const noProxyVal = process.env.no_proxy || process.env.npm_config_noproxy;
    const corporateProxyServer = getCorporateProxyServer(config.proxy);
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
        if (corporateProxyServer && !isHostExcludedFromProxy(noProxyVal, ui5Config.url)) {
            proxyOptions.agent = new HttpsProxyAgent(corporateProxyServer);
        }
        router.use(ui5Config.path, ui5Proxy(ui5Config, proxyOptions));
    }

    return router;
};
