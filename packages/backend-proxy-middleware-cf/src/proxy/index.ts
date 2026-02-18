import type { RequestHandler } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';

import type { ToolsLogger } from '@sap-ux/logger';

import type { CreateProxyOptions, EffectiveOptions, RouteEntry } from '../types';
import { createPathFilter, getMimeInfo, getRequestOrigin, replaceUrl } from './utils';

/**
 * Request in proxyReq callback, extended with UI5 server middleware properties.
 */
interface ProxyReqRequest extends IncomingMessage {
    'ui5-middleware-index'?: { url: string };
    'ui5-patched-router'?: { baseUrl?: string; originalUrl?: string };
}

/**
 * Response in proxyReq/proxyRes callbacks, extended with redirect and our middleware metadata.
 */
interface ProxyReqResponse extends ServerResponse {
    /** Express response redirect (added by UI5 tooling). */
    redirect(url: string): void;
    /** Set by this middleware when a redirect was already sent. */
    'backend-proxy-middleware-cf'?: { redirected?: boolean };
}

/**
 * Create the response interceptor for the proxy (content-type + URL rewriting).
 *
 * @param {RouteEntry[]} routes - Route entries with regex and destination URLs.
 * @param {EffectiveOptions} effectiveOptions - Merged options (rewriteContent, rewriteContentTypes, debug).
 * @param {string} baseUri - Base URI of the approuter (for debug log).
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {ReturnType<typeof responseInterceptor>} The interceptor function to pass to responseInterceptor().
 */
export function createResponseInterceptor(
    routes: RouteEntry[],
    effectiveOptions: EffectiveOptions,
    baseUri: string,
    logger: ToolsLogger
): ReturnType<typeof responseInterceptor> {
    return responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        const url = req.url ?? '';
        if (effectiveOptions.debug) {
            logger.info(`${req.method} ${url} -> ${baseUri}${url} [${proxyRes.statusCode}]`);
        }
        const pathname = /^[^?]*/.exec(url)?.[0] ?? url;
        const {
            type,
            charset,
            contentType: ct
        } = getMimeInfo(pathname, proxyRes.headers['content-type'] as string | undefined);
        res.setHeader('content-type', ct);

        const route = routes.find((routeEntry) => routeEntry.re.test(url));
        if (route?.path && route.url && effectiveOptions?.rewriteContentTypes?.includes(type?.toLowerCase() ?? '')) {
            const encoding = (charset ?? 'utf8') as BufferEncoding;
            let data = responseBuffer.toString(encoding);

            const referrer =
                (req.headers.referrer as string) ?? (req.headers.referer as string) ?? getRequestOrigin(req);
            const referrerUrl = new URL(route.path, referrer).toString();

            data = replaceUrl(data, `https://${route.url.slice(8)}`, referrerUrl);
            if (route.url.startsWith('https://')) {
                data = replaceUrl(data, `http://${route.url.slice(8)}`, referrerUrl);
            }

            return Buffer.from(data);
        }
        return responseBuffer;
    });
}

/**
 * Create the proxy middleware that forwards matching requests to the approuter.
 * Paths are proxied if they match any customRoute (e.g. welcome, login callback) or any destination route.
 *
 * @param {CreateProxyOptions} options - customRoutes, routes, baseUri, effectiveOptions, logger.
 * @returns {RequestHandler} Express request handler (the proxy middleware).
 */
export function createProxy(options: CreateProxyOptions): RequestHandler {
    const { customRoutes, routes, baseUri, effectiveOptions, logger } = options;

    const intercept = createResponseInterceptor(routes, effectiveOptions, baseUri, logger);
    const pathFilter = createPathFilter(customRoutes, routes);

    const proxyMiddleware = createProxyMiddleware({
        logger: effectiveOptions.debug ? logger : undefined,
        target: baseUri,
        pathFilter,
        changeOrigin: true,
        selfHandleResponse: true,
        autoRewrite: true,
        xfwd: true,
        on: {
            proxyReq: (proxyReq, req: ProxyReqRequest, res: ProxyReqResponse) => {
                const xfp = req.headers['x-forwarded-proto'];
                if (typeof xfp === 'string' && xfp.includes(',')) {
                    const proto = xfp.split(',')[0];
                    req.headers['x-forwarded-proto'] = proto;
                    proxyReq.setHeader('x-forwarded-proto', proto);
                }

                if (req['ui5-middleware-index']?.url === '/') {
                    res['backend-proxy-middleware-cf'] = { redirected: true };
                    const baseUrl = req['ui5-patched-router']?.baseUrl ?? '/';
                    res.redirect(`${baseUrl === '/' ? '' : baseUrl}${req.url ?? ''}`);
                } else {
                    const originalUrl = req['ui5-patched-router']?.originalUrl;
                    if (originalUrl) {
                        proxyReq.setHeader('x-forwarded-path', originalUrl);
                    }
                }
            },
            proxyRes: async (proxyRes, req, res: ProxyReqResponse) => {
                if (!res['backend-proxy-middleware-cf']?.redirected) {
                    return intercept(proxyRes, req, res);
                }
                return undefined;
            }
        }
    });

    return proxyMiddleware;
}
