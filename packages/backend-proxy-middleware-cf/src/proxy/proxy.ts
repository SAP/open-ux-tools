import type { RequestHandler } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';

import type { ToolsLogger } from '@sap-ux/logger';

import { PROXY_MARKER_HEADER } from '../config/constants';
import type { CreateProxyOptions, EffectiveOptions, RouteEntry } from '../types';
import { createProxyFilter, getMimeInfo, getRequestOrigin, replaceUrl } from './utils';

/**
 * Request in proxyReq callback, extended with UI5 server middleware properties.
 */
interface ProxyReqRequest extends IncomingMessage {
    'ui5-middleware-index'?: { url: string };
    /** Set by cds-plugin-ui5; baseUrl/originalUrl used for redirect and x-forwarded-path. */
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
 * @param routes - Route entries with regex and destination URLs.
 * @param effectiveOptions - Merged options (rewriteContent, rewriteContentTypes, debug).
 * @returns The interceptor function to pass to responseInterceptor().
 */
export function createResponseInterceptor(
    routes: RouteEntry[],
    effectiveOptions: EffectiveOptions
): ReturnType<typeof responseInterceptor> {
    return responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        const url = req.url ?? '';
        const pathname = /^[^?]*/.exec(url)?.[0] ?? url;
        const {
            type,
            charset,
            contentType: ct
        } = getMimeInfo(pathname, proxyRes.headers['content-type'] as string | undefined);
        res.setHeader('content-type', ct);

        const route = routes.find((routeEntry) => routeEntry.sourcePattern.test(url));
        if (route?.path && route.url && effectiveOptions?.rewriteContentTypes?.includes(type?.toLowerCase() ?? '')) {
            const encoding = (charset ?? 'utf8') as BufferEncoding;
            let data = responseBuffer.toString(encoding);

            const referrer =
                (req.headers.referrer as string) ?? (req.headers.referer as string) ?? getRequestOrigin(req);
            const referrerUrl = new URL(route.path, referrer).toString();

            const routeUrlParsed = new URL(route.url);
            const hostAndPath = `${routeUrlParsed.host}${routeUrlParsed.pathname}`;
            data = replaceUrl(data, `https://${hostAndPath}`, referrerUrl);
            data = replaceUrl(data, `http://${hostAndPath}`, referrerUrl);

            return Buffer.from(data);
        }
        return responseBuffer;
    });
}

/**
 * Create the proxy middleware that forwards matching requests to the approuter.
 * Paths are proxied if they match any customRoute (e.g. welcome, login callback) or any destination route.
 *
 * @param options - customRoutes, routes, baseUri, effectiveOptions.
 * @param logger - Logger instance.
 * @returns Express request handler (the proxy middleware).
 */
export function createProxy(options: CreateProxyOptions, logger: ToolsLogger): RequestHandler {
    const { customRoutes, routes, baseUri, effectiveOptions, basExternalUrl } = options;

    const intercept = createResponseInterceptor(routes, effectiveOptions);
    const proxyFilter = createProxyFilter(customRoutes, routes);

    const proxyMiddleware = createProxyMiddleware({
        logger: effectiveOptions.debug ? logger : undefined,
        target: baseUri,
        pathFilter: proxyFilter,
        changeOrigin: true,
        selfHandleResponse: true,
        autoRewrite: true,
        xfwd: true,
        on: {
            proxyReq: (proxyReq, req: ProxyReqRequest, res: ProxyReqResponse) => {
                proxyReq.setHeader(PROXY_MARKER_HEADER, '1');

                const xfp = req.headers['x-forwarded-proto'];
                if (typeof xfp === 'string' && xfp.includes(',')) {
                    const proto = xfp.split(',')[0];
                    req.headers['x-forwarded-proto'] = proto;
                    proxyReq.setHeader('x-forwarded-proto', proto);
                }

                if (basExternalUrl) {
                    proxyReq.setHeader('x-forwarded-host', basExternalUrl.host);
                    proxyReq.setHeader('x-forwarded-proto', basExternalUrl.protocol.replace(':', ''));
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
            },
            error: (err, _req, res) => {
                logger.error(`Approuter proxy error: ${err.message}`);
                const response = res as ServerResponse;
                if (!response.headersSent) {
                    response.writeHead(502, { 'Content-Type': 'text/plain' });
                    response.end(`Approuter is not reachable: ${err.message}`);
                }
            }
        }
    });

    return proxyMiddleware;
}
