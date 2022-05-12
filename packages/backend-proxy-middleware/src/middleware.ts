import type { MiddlewareParameters, ProxyConfig } from './base/types';
import { getBackendProxy } from './base/proxy';
import { mergeConfigWithEnvVariables } from './base/config';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { RequestHandler } from 'express';
import { Router as createRouter } from 'express';

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
module.exports = async ({ options }: MiddlewareParameters<ProxyConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'backend-proxy-middleware' })]
    });
    const router = createRouter();
    const config = mergeConfigWithEnvVariables(options.configuration);

    logger.info(
        `Starting backend-proxy-middleware using following configuration:\nproxy: '${formatProxyForLogging(
            config.proxy
        )}'\nignoreCertError: '${config.ignoreCertError ? 'true' : 'false'}'\nbackend: ${JSON.stringify(
            config.backend
        )}\ndebug: '${config.debug ? 'true' : 'false'}'`
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
