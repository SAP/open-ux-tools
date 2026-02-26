import mime from 'mime-types';
import contentType from 'content-type';
import type { IncomingMessage } from 'node:http';

import type { MimeInfo, RouteEntry } from '../types';

/**
 * Replaces oldUrl with newUrl in text (regex-safe).
 *
 * @param text - Full text to replace in.
 * @param oldUrl - URL to replace (will be escaped for regex).
 * @param newUrl - Replacement URL.
 * @returns Text with URLs replaced.
 */
export function replaceUrl(text: string, oldUrl: string, newUrl: string): string {
    const escaped = oldUrl.replaceAll(/[-/\\^$*+?.()|[\]{}]/g, String.raw`\$&`);
    const regex = new RegExp(escaped, 'gi');
    return text.replace(regex, newUrl);
}

/**
 * Returns a path filter that accepts pathnames matching any custom route pattern or any destination route regex.
 *
 * @param customRoutes - Route path patterns (e.g. '/', '/login/callback').
 * @param routes - Route entries with compiled regex.
 * @returns Filter function (pathname) => boolean.
 */
export function createPathFilter(customRoutes: string[], routes: RouteEntry[]): (pathname: string) => boolean {
    return (pathname: string): boolean =>
        customRoutes.some((r) => new RegExp(String.raw`^${r}(\?.*)?$`).test(pathname)) ||
        routes.some((route) => route.re.test(pathname));
}

/**
 * Build origin URL from request headers (x-forwarded-proto, x-forwarded-host) and baseUrl.
 *
 * @param req - Request-like object.
 * @param req.headers - Request headers.
 * @param req.baseUrl - Optional base URL path.
 * @returns Origin URL string.
 */
export function getRequestOrigin(req: IncomingMessage & { baseUrl?: string }): string {
    return `${String((req.headers['x-forwarded-proto'] ?? 'https').toString().split(',')[0])}://${req.headers['x-forwarded-host'] ?? ''}${req.baseUrl ?? ''}`;
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
