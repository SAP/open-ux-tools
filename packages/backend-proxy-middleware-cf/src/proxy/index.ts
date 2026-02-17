import contentType from 'content-type';
import mime from 'mime-types';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';

import type { RequestHandler } from 'express';
import type { ToolsLogger } from '@sap-ux/logger';

import type { EffectiveOptions, MimeInfo, RouteEntry } from '../config';

/**
 * Replaces oldUrl with newUrl in text (regex-safe).
 *
 * @param text - Full text to replace in.
 * @param oldUrl - URL to replace (will be escaped for regex).
 * @param newUrl - Replacement URL.
 * @returns Text with URLs replaced.
 */
export function replaceUrl(text: string, oldUrl: string, newUrl: string): string {
    const escaped = oldUrl.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    return text.replace(regex, newUrl);
}

/**
 * Get mime type, charset and content-type header value from pathname and optional Content-Type header.
 *
 * @param pathname - Request path (used when no ctValue).
 * @param ctValue - Content-Type header value.
 * @returns MimeInfo object.
 */
export function getMimeInfo(pathname: string, ctValue: string | undefined): MimeInfo {
    if (ctValue) {
        const parsed = contentType.parse(ctValue);
        const type = parsed.type ?? 'application/octet-stream';
        const charset = parsed.parameters?.charset ?? (mime.charset(type) as string) ?? 'utf-8';
        return {
            type,
            charset,
            contentType: contentType.format({ type, parameters: parsed.parameters })
        };
    }
    const type = mime.lookup(pathname) || 'application/octet-stream';
    const charset = (mime.charset(type) as string | false) || 'utf-8';
    return {
        type,
        charset,
        contentType: `${type}; charset=${charset}`
    };
}

/**
 * Create the response interceptor for the proxy (content-type + URL rewriting).
 *
 * @param routes - Route entries with regex and destination URLs.
 * @param effectiveOptions - Merged options (rewriteContent, rewriteContentTypes, debug).
 * @param baseUri - Base URI of the approuter (for debug log).
 * @param logger - Logger instance.
 * @returns The interceptor function to pass to responseInterceptor().
 */
export function createResponseInterceptor(
    routes: RouteEntry[],
    effectiveOptions: EffectiveOptions,
    baseUri: string,
    logger: ToolsLogger
): ReturnType<typeof responseInterceptor> {
    return responseInterceptor(
        async (
            responseBuffer,
            proxyRes,
            req: {
                url?: string;
                method?: string;
                headers: Record<string, string | string[] | undefined>;
                baseUrl?: string;
            },
            res
        ) => {
            const url = req.url ?? '';
            if (effectiveOptions.debug) {
                logger.info(`${req.method} ${url} -> ${baseUri}${url} [${proxyRes.statusCode}]`);
            }
            const pathname = url.match(/^[^?]*/)?.[0] ?? url;
            const {
                type,
                charset,
                contentType: ct
            } = getMimeInfo(pathname, proxyRes.headers['content-type'] as string | undefined);
            res.setHeader('content-type', ct);

            const route = routes.find((r) => r.re.test(url));
            if (
                route?.path &&
                route.url &&
                effectiveOptions.rewriteContent &&
                effectiveOptions.rewriteContentTypes.indexOf(type?.toLowerCase()) >= 0
            ) {
                const encoding = (charset ?? 'utf8') as BufferEncoding;
                let data = responseBuffer.toString(encoding);
                const referrer =
                    (req.headers.referrer as string) ??
                    (req.headers.referer as string) ??
                    `${String((req.headers['x-forwarded-proto'] ?? 'https').toString().split(',')[0])}://${req.headers['x-forwarded-host'] ?? ''}${req.baseUrl ?? ''}`;
                const referrerUrl = new URL(route.path, referrer).toString();
                data = replaceUrl(data, `https://${route.url.slice(8)}`, referrerUrl);
                if (route.url.startsWith('https://')) {
                    data = replaceUrl(data, `http://${route.url.slice(8)}`, referrerUrl);
                }
                return Buffer.from(data);
            }
            return responseBuffer;
        }
    );
}

/**
 * Create the proxy middleware that forwards matching requests to the approuter.
 *
 * @param pathFilter - Function that returns true for paths to proxy.
 * @param baseUri - Target base URI (e.g. http://localhost:port).
 * @param intercept - Response interceptor (from createResponseInterceptor).
 * @param effectiveOptions - Merged options (debug).
 * @param logger - Logger instance.
 * @returns Express request handler (the proxy middleware).
 */
export function createProxy(
    pathFilter: (pathname: string) => boolean,
    baseUri: string,
    intercept: ReturnType<typeof responseInterceptor>,
    effectiveOptions: EffectiveOptions,
    logger: ToolsLogger
): RequestHandler {
    const proxyMiddleware = createProxyMiddleware({
        logger: effectiveOptions.debug ? logger : undefined,
        target: baseUri,
        pathFilter,
        changeOrigin: true,
        selfHandleResponse: true,
        autoRewrite: true,
        xfwd: true,
        on: {
            proxyReq: (
                proxyReq,
                req: Record<string, unknown> & {
                    headers: Record<string, string | string[] | undefined>;
                },
                res: Record<string, unknown>
            ) => {
                const xfp = req.headers['x-forwarded-proto'];
                if (typeof xfp === 'string' && xfp.indexOf(',') !== -1) {
                    const proto = xfp.split(',')[0];
                    req.headers['x-forwarded-proto'] = proto;
                    proxyReq.setHeader('x-forwarded-proto', proto);
                }
                if ((req as { 'ui5-middleware-index'?: { url: string } })['ui5-middleware-index']?.url === '/') {
                    (res as Record<string, unknown>)['backend-proxy-middleware-cf'] = { redirected: true };
                    const baseUrl =
                        (req as { 'ui5-patched-router'?: { baseUrl: string } })['ui5-patched-router']?.baseUrl ?? '/';
                    (res as { redirect: (u: string) => void }).redirect(`${baseUrl !== '/' ? baseUrl : ''}${req.url}`);
                } else {
                    const patched = (req as unknown as { 'ui5-patched-router'?: { originalUrl: string } })[
                        'ui5-patched-router'
                    ];
                    if (patched?.originalUrl) {
                        proxyReq.setHeader('x-forwarded-path', patched.originalUrl);
                    }
                }
            },
            proxyRes: async (proxyRes, req, res) => {
                const resRecord = res as Record<string, { redirected?: boolean }>;
                if (!resRecord['backend-proxy-middleware-cf']?.redirected) {
                    return (intercept as unknown as (p: unknown, r: unknown, s: unknown) => Promise<Buffer>)(
                        proxyRes,
                        req,
                        res
                    );
                }
                return undefined;
            }
        }
    });

    return proxyMiddleware as unknown as RequestHandler;
}
