import express, { RequestHandler } from 'express';
import { MiddlewareParameters, ProxyConfig, UI5Config } from './types';
import { ui5Proxy } from './proxy';
import { getCorporateProxyServer, isHostExcludedFromProxy, logger } from 'utils';
import { Options } from 'http-proxy-middleware';
import { HttpsProxyAgent } from 'https-proxy-agent';

module.exports = ({ options }: MiddlewareParameters<ProxyConfig>): RequestHandler => {
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
        logLevel: debug ? 'debug' : 'silent'
    };

    logger.info(
        `Starting ui5-proxy-middleware using following configuration:\nproxy: '${proxyInfo}'\nsecure: '${
            secure ? 'true' : 'false'
        }'\ndebug: '${debug ? 'true' : 'false'}'`
    );

    for (const ui5Config of config.ui5) {
        logger.info(`ui5: ${JSON.stringify(ui5Config)}`);
        if (corporateProxyServer && !isHostExcludedFromProxy(noProxyVal, ui5Config.url)) {
            proxyOptions.agent = new HttpsProxyAgent(corporateProxyServer);
        }
        router.use(ui5Config.path, ui5Proxy(ui5Config, proxyOptions));
    }

    return router;
};
