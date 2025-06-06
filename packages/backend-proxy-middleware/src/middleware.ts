import dotenv from 'dotenv';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { MiddlewareParameters, BackendMiddlewareConfig } from './base/types';
import { generateProxyMiddlewareOptions, initI18n } from './base/proxy';
import express from 'express';

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
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    return proxy || 'none';
}

/**
 * UI5 middleware allowing to proxy backends.
 *
 * @param params input parameters for UI5 middleware
 * @param params.options configuration options
 * @returns {*}  {(Promise<RequestHandler>)}
 */
module.exports = async ({ options }: MiddlewareParameters<BackendMiddlewareConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'backend-proxy-middleware' })]
    });

    await initI18n();
    dotenv.config();
    const router = express.Router();

    const backend = options.configuration.backend;
    const configOptions = options.configuration.options ?? {};
    configOptions.secure = configOptions.secure !== undefined ? !!configOptions.secure : true;
    configOptions.logger = options.configuration?.debug ? logger : undefined;

    try {
        const proxyOptions = await generateProxyMiddlewareOptions(options.configuration.backend, configOptions);
        const proxyFn = createProxyMiddleware(proxyOptions);
        logger.info(
            `Starting backend-proxy-middleware using following configuration:\nbackend: ${JSON.stringify({
                ...backend,
                proxy: formatProxyForLogging(backend.proxy)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            })}\noptions: ${JSON.stringify(({ logger, ...rest } = configOptions) => rest)}'\nlog: '${
                options.configuration?.debug ? 'debug' : 'info'
            }'`
        );
        //})}\noptions: ${JSON.stringify(configOptions)}'\nlog: '${options.configuration?.debug ? 'debug' : 'info'}'`
        return router.use(backend.path, proxyFn);
    } catch (e) {
        const message = `Failed to register backend for ${backend.path}. Check configuration in yaml file. \n\t${e}`;
        logger.error(message);
        throw new Error(message);
    }
};
