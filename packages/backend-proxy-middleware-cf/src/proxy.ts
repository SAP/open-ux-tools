import type connect from 'connect';
import type { Url } from 'node:url';
import type { Socket } from 'node:net';
import { type Request, Router } from 'express';
import type { Options } from 'http-proxy-middleware';
import type { IncomingMessage, ServerResponse } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';

import type { ToolsLogger } from '@sap-ux/logger';

import type { OAuthTokenProvider } from './token';

export type EnhancedIncomingMessage = (IncomingMessage & Pick<Request, 'originalUrl'>) | connect.IncomingMessage;

/**
 * Creates proxy options for http-proxy-middleware.
 *
 * @param {string} targetUrl - The target URL to proxy to.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {Options} Proxy options configuration.
 */
export function createProxyOptions(targetUrl: string, logger: ToolsLogger): Options {
    return {
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: (path: string, req: EnhancedIncomingMessage): string => {
            // Express router.use() strips the matched path from req.url,
            // use originalUrl to get the full path before Express stripped it
            const originalUrl = req.originalUrl ?? req.url ?? path;
            const urlPath = originalUrl.split('?')?.[0];
            const queryString = originalUrl.includes('?') ? originalUrl.substring(originalUrl.indexOf('?')) : '';
            const fullPath = urlPath + queryString;
            logger.debug(`Rewrite path ${path} > ${fullPath}`);
            return fullPath;
        },
        on: {
            error: (
                err: Error & { code?: string },
                req: EnhancedIncomingMessage & { next?: Function },
                _res: ServerResponse | Socket,
                _target: string | Partial<Url> | undefined
            ): void => {
                logger.error(`Proxy error for ${req.originalUrl ?? req.url}: ${err.message}`);
                if (typeof req.next === 'function') {
                    req.next(err);
                }
            }
        }
    };
}

/**
 * Registers a proxy route for a given path.
 *
 * @param {string} path - Path to register.
 * @param {string} destinationUrl - Target URL for proxying.
 * @param {OAuthTokenProvider} tokenProvider - Token provider instance.
 * @param {ToolsLogger} logger - Logger instance.
 * @param {Router} router - Express router instance.
 */
export function registerProxyRoute(
    path: string,
    destinationUrl: string,
    tokenProvider: OAuthTokenProvider,
    logger: ToolsLogger,
    router: Router
): void {
    const proxyOptions = createProxyOptions(destinationUrl, logger);
    const proxyFn = createProxyMiddleware(proxyOptions);
    const tokenMiddleware = tokenProvider.createTokenMiddleware();

    router.use(path, tokenMiddleware, proxyFn);
    logger.info(`Registered proxy for path: ${path} -> ${destinationUrl}`);
}

/**
 * Sets up all proxy routes for the configured paths.
 *
 * @param {string[]} paths - Array of paths to register.
 * @param {string} destinationUrl - Target URL for proxying.
 * @param {OAuthTokenProvider} tokenProvider - Token provider instance.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {Router} Configured Express router.
 */
export function setupProxyRoutes(
    paths: string[],
    destinationUrl: string,
    tokenProvider: OAuthTokenProvider,
    logger: ToolsLogger
): Router {
    const router = Router();

    for (const path of paths) {
        try {
            registerProxyRoute(path, destinationUrl, tokenProvider, logger, router);
        } catch (e) {
            throw new Error(`Failed to register proxy for ${path}. Check configuration in yaml file. \n\t${e.message}`);
        }
    }

    return router;
}
