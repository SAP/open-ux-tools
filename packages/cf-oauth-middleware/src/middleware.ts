import type { RequestHandler, Request, Response, NextFunction } from 'express';

import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

import type { MiddlewareParameters } from './types';
import type { CfOAuthMiddlewareConfig } from './types';
import type { OAuthTokenManager } from './oauth-manager';
import { createManagerFromOAuthCredentials, createManagerFromCfAdpProject } from './token-manager-factory';

/**
 * UI5 middleware for adding OAuth2 Bearer tokens to requests for CF ADP projects.
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
    const path = config.path || '/odata';
    let tokenManager: OAuthTokenManager | null = null;

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

    logger.debug(`CF OAuth middleware options: ${JSON.stringify({ path, hasTokenManager: !!tokenManager })}`);

    return async (req: Request, res: Response, next: NextFunction) => {
        if (!tokenManager) {
            next();
            return;
        }

        if (!req.url.startsWith(path)) {
            next();
            return;
        }

        try {
            const token = await tokenManager.getAccessToken();
            req.headers.authorization = `Bearer ${token}`;
            logger.debug(`Added Bearer token to request: ${req.url}`);
        } catch (error: any) {
            logger.error(`Failed to add token to request ${req.url}: ${error.message}`);
            return res.status(500).json({ error: 'Authentication failed' });
        }

        next();
    };
};
