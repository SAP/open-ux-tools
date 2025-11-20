import type { RequestHandler, Request, Response, NextFunction } from 'express';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

import type { MiddlewareParameters } from './types';
import { createProxyOptions } from './proxy-config';
import type { CfOAuthMiddlewareConfig } from './types';
import type { OAuthTokenManager } from './oauth-manager';
import { createManagerFromOAuthCredentials, createManagerFromCfAdpProject } from './token-factory';

/**
 * UI5 middleware for proxying requests to Cloud Foundry destinations with OAuth2 authentication.
 * Supports one destination URL with multiple OData source paths.
 *
 * @param {MiddlewareParameters<CfOAuthMiddlewareConfig>} params - Input parameters for UI5 middleware.
 * @param {CfOAuthMiddlewareConfig} params.options - Configuration options.
 * @returns {Promise<RequestHandler>} Express middleware handler.
 */
module.exports = async ({ options }: MiddlewareParameters<CfOAuthMiddlewareConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        logLevel: options.configuration?.debug ? LogLevel.Debug : LogLevel.Info,
        transports: [new UI5ToolingTransport({ moduleName: 'cf-oauth-middleware' })]
    });

    const config = options.configuration || {};

    if (!config.url) {
        logger.warn('CF OAuth middleware requires url configuration. Middleware will be inactive.');
        return async (_req: Request, _res: Response, next: NextFunction) => {
            next();
        };
    }

    if (!config.paths || !Array.isArray(config.paths) || config.paths.length === 0) {
        logger.warn('CF OAuth middleware has no paths configured. Middleware will be inactive.');
        return async (_req: Request, _res: Response, next: NextFunction) => {
            next();
        };
    }

    let tokenManager: OAuthTokenManager;

    if (config.credentials) {
        logger.info('Initializing CF OAuth middleware with provided credentials');
        const { clientId, clientSecret, url } = config.credentials;
        tokenManager = createManagerFromOAuthCredentials(clientId, clientSecret, url, logger);
    } else {
        logger.info('Attempting to auto-detect CF ADP project for OAuth credentials');
        tokenManager = await createManagerFromCfAdpProject(process.cwd(), logger);

        if (!tokenManager) {
            logger.warn(
                'CF ADP project not detected and no manual credentials provided. OAuth middleware will be disabled.'
            );
        } else {
            logger.info('CF ADP project detected, OAuth middleware enabled');
        }
    }

    const router = express.Router();
    const destinationUrl = config.url;

    for (const path of config.paths) {
        if (!path) {
            logger.warn('Skipping empty path in configuration');
            continue;
        }

        const proxyOptions = createProxyOptions(destinationUrl, logger);

        try {
            const proxyFn = createProxyMiddleware(proxyOptions);
            const tokenMiddleware = tokenManager.createTokenMiddleware(config.debug);
            router.use(path, tokenMiddleware, proxyFn);
            logger.info(`Registered proxy for path: ${path} -> ${destinationUrl}`);
        } catch (error: any) {
            const message = `Failed to register proxy for ${path}. Check configuration in yaml file. \n\t${error.message}`;
            logger.error(message);
            throw new Error(message);
        }
    }

    logger.info(`CF OAuth middleware initialized: url=${destinationUrl}, paths=${config.paths.join(', ')}`);

    return router as unknown as RequestHandler;
};
