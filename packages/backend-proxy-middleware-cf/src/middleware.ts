import type { RequestHandler } from 'express';
import type { MiddlewareParameters } from '@ui5/server';

import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

import { setupProxyRoutes } from './proxy';
import { validateConfig } from './validation';
import { createTokenProvider } from './token';
import type { CfOAuthMiddlewareConfig } from './types';

/**
 * UI5 middleware for proxying requests to Cloud Foundry destinations with OAuth2 authentication.
 * Supports one destination URL with multiple OData source paths.
 *
 * @param {MiddlewareParameters<CfOAuthMiddlewareConfig>} params - Input parameters for UI5 middleware.
 * @param {CfOAuthMiddlewareConfig} params.options - Configuration options.
 * @returns {Promise<RequestHandler>} Express middleware handler.
 */
module.exports = async ({ options }: MiddlewareParameters<CfOAuthMiddlewareConfig>): Promise<RequestHandler> => {
    const config = options.configuration;
    if (!config) {
        throw new Error('Backend proxy middleware (CF) has no configuration.');
    }

    const logger = new ToolsLogger({
        logLevel: config.debug ? LogLevel.Debug : LogLevel.Info,
        transports: [new UI5ToolingTransport({ moduleName: 'backend-proxy-middleware-cf' })]
    });

    await validateConfig(config, logger);

    const tokenProvider = await createTokenProvider(config, logger);
    return setupProxyRoutes(config.paths, config.url, tokenProvider, logger) as unknown as RequestHandler;
};
