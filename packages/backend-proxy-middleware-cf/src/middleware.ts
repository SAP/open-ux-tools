import type { RequestHandler } from 'express';

import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

import { setupProxyRoutes } from './proxy';
import { validateConfig } from './validation';
import { createTokenProvider } from './token';
import type { MiddlewareParameters } from './types';
import type { CfOAuthMiddlewareConfig } from './types';

/**
 * UI5 middleware for proxying requests to Cloud Foundry destinations with OAuth2 authentication.
 * Supports multiple destination URLs with their own OData source paths.
 *
 * @param {MiddlewareParameters<CfOAuthMiddlewareConfig>} params - Input parameters for UI5 middleware.
 * @param {CfOAuthMiddlewareConfig} params.options - Configuration options.
 * @returns {Promise<RequestHandler>} Express middleware handler.
 */
module.exports = async ({ options }: MiddlewareParameters<CfOAuthMiddlewareConfig>): Promise<RequestHandler> => {
    const config = options.configuration || {};
    const logger = new ToolsLogger({
        logLevel: config.debug ? LogLevel.Debug : LogLevel.Info,
        transports: [new UI5ToolingTransport({ moduleName: 'backend-proxy-middleware-cf' })]
    });

    await validateConfig(config, logger);

    const tokenProvider = await createTokenProvider(config, logger);

    // Setup proxy routes for all backends
    const router = setupProxyRoutes(config.backends, tokenProvider, logger);

    // Log initialization
    config.backends.forEach((backend) => {
        logger.info(`Backend proxy middleware (CF) initialized: url=${backend.url}, paths=${backend.paths.join(', ')}`);
    });

    return router as unknown as RequestHandler;
};
