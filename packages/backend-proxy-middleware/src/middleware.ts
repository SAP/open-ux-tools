import type { MiddlewareParameters, ProxyConfig } from './base/types';
import { getBackendProxy } from './base/proxy';
import { mergeConfigWithEnvVariables } from './base/config';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import express, { RequestHandler } from 'express';

/**
 * Fiori tools proxy middleware
 */
module.exports = async ({ options }: MiddlewareParameters<ProxyConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'backend-proxy-middleware' })]
    });
    const router = express.Router();
    const config = mergeConfigWithEnvVariables(options.configuration);
    const proxyInfo = config.proxy ? config.proxy.replace(/\/\/(.*:{0,1}.*@)/, '//***:***@') : config.proxy;

    logger.info(
        `Starting backend-proxy-middleware using following configuration:\nproxy: '${proxyInfo}'\nignoreCertError: '${
            config.ignoreCertError ? 'true' : 'false'
        }'\nbackend: ${JSON.stringify(config.backend)}\ndebug: '${config.debug ? 'true' : 'false'}'`
    );

    if (config.backend) {
        for (const backend of config.backend) {
            try {
                router.use(backend.path, await getBackendProxy(backend, config, logger));
            } catch (e) {
                const message = `Failed to register backend for ${backend.path}. Check configuration in yaml file. \n\t${e}`;
                logger.error(message);
                throw new Error(message);
            }
        }
    }

    return router;
};
