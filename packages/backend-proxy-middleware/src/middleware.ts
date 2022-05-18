import dotenv from 'dotenv';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { RequestHandler } from 'express';
import { Router as createRouter } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { MiddlewareParameters, BackendMiddlewareConfig } from './base/types';
import { generateProxyMiddlewareOptions, initI18n } from './base/proxy';
import { addOptionsForEmbeddedBSP } from './ext/bsp';

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

    const router = createRouter();
    const backend = options.configuration.backend;
    const configOptions = options.configuration.options ?? {};
    configOptions.secure = configOptions.secure !== undefined ? !!configOptions.secure : true;

    try {
        const proxyOptions = await generateProxyMiddlewareOptions(options.configuration.backend, configOptions, logger);
        if (backend.bsp) {
            addOptionsForEmbeddedBSP(backend.bsp, proxyOptions, logger);
        }
        router.use(backend.path, createProxyMiddleware(proxyOptions));
        logger.info(
            `Starting backend-proxy-middleware using following configuration:\nproxy: '${formatProxyForLogging(
                backend.proxy
            )}'\nbackend: ${JSON.stringify(backend)}\noptions: ${JSON.stringify(configOptions)}'`
        );
    } catch (e) {
        const message = `Failed to register backend for ${backend.path}. Check configuration in yaml file. \n\t${e}`;
        logger.error(message);
        throw new Error(message);
    }

    return router;
};
