import dotenv from 'dotenv';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { MiddlewareParameters, BackendMiddlewareConfig } from './base/types';
import { generateProxyMiddlewareOptions, initI18n } from './base/proxy';

/**
 * Hides the proxy credentials for displaying the proxy configuration in the console.
 *
 * @param proxy - user's proxy server
 * @returns proxy with hidden credentials for displaying in the console
 */
function formatProxyForLogging(proxy: string | undefined): string | undefined {
    if (proxy) {
        const forwardSlashIndex = proxy.indexOf('//');
        const atIndex = proxy.indexOf('@');

        if (forwardSlashIndex !== -1 && atIndex !== -1) {
            proxy = proxy.replace(proxy.slice(forwardSlashIndex + 2, atIndex), '***:***');
        }
    }
    return proxy || 'none';
}

/**
 * UI5 middleware allowing to to proxy backends.
 *
 * @param params input parameters for UI5 middleware
 * @param params.options configuration options
 */
module.exports = async ({ options }: MiddlewareParameters<BackendMiddlewareConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'backend-proxy-middleware' })]
    });

    await initI18n();
    dotenv.config();

    const backend = options.configuration.backend;
    const configOptions = options.configuration.options ?? {};
    configOptions.secure = configOptions.secure !== undefined ? !!configOptions.secure : true;

    try {
        const proxyOptions = await generateProxyMiddlewareOptions(options.configuration.backend, configOptions, logger);
        const proxyFn = createProxyMiddleware(proxyOptions);
        logger.info(
            `Starting backend-proxy-middleware using following configuration:\nbackend: ${JSON.stringify({
                ...backend,
                proxy: formatProxyForLogging(backend.proxy)
            })}\noptions: ${JSON.stringify(configOptions)}'`
        );

        return (req, res, next) => {
            if (req.path.startsWith(backend.path)) {
                proxyFn(req, res, next);
            } else {
                next();
            }
        };
    } catch (e) {
        const message = `Failed to register backend for ${backend.path}. Check configuration in yaml file. \n\t${e}`;
        logger.error(message);
        throw new Error(message);
    }
};
