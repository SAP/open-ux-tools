import type { Options } from 'http-proxy-middleware';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Socket } from 'node:net';
import type { Url } from 'node:url';

import type { ToolsLogger } from '@sap-ux/logger';

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
        pathRewrite: (strippedPath: string, req: IncomingMessage) => {
            // Express router.use() strips the matched path from req.url,
            // use originalUrl to get the full path before Express stripped it
            const originalUrl = (req as any).originalUrl || req.url || strippedPath;
            const urlPath = originalUrl.split('?')[0];
            const queryString = originalUrl.includes('?') ? originalUrl.substring(originalUrl.indexOf('?')) : '';
            const fullPath = urlPath + queryString;
            logger.debug(
                `Forwarding full path: ${fullPath} (originalUrl=${originalUrl}, req.url=${req.url}, strippedPath=${strippedPath})`
            );
            return fullPath;
        },
        on: {
            error: (
                err: Error & { code?: string },
                req: IncomingMessage & { next?: Function; originalUrl?: string },
                _res: ServerResponse | Socket,
                _target: string | Partial<Url> | undefined
            ) => {
                logger.error(`Proxy error for ${req.originalUrl || req.url}: ${err.message}`);
                if (typeof req.next === 'function') {
                    req.next(err);
                }
            }
        }
    };
}
