import type { Filter, Options, RequestHandler } from 'http-proxy-middleware';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import type { ProxyConfig } from './types';
import {
    proxyRequestHandler,
    proxyResponseHandler,
    filterCompressedHtmlFiles,
    filterExcludeComponentNamespace,
    proxyErrorHandler,
    updateProxyEnv,
    getPathRewrite
} from './utils';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { Url } from 'node:url';
import { getProxyForUrl } from 'proxy-from-env';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { Socket } from 'node:net';
import type { UI5ProxyConfig } from '@sap-ux/ui5-config';
//eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareParameters } from '@ui5/server';

/**
 * Creates a combined proxy filter by merging the base filter with namespace exclusion and custom filters.
 *
 * @param customFilter - optional custom filter from configuration
 * @param middlewareUtil - middleware utilities for namespace detection
 * @returns Combined filter function
 */
function createCombinedProxyFilter(
    customFilter?: Filter,
    middlewareUtil?: MiddlewareParameters<UI5ProxyConfig>['middlewareUtil']
): Filter<IncomingMessage> {
    const baseFilter: Filter = customFilter ?? filterCompressedHtmlFiles;
    const namespaceFilter = filterExcludeComponentNamespace(middlewareUtil);

    if (!namespaceFilter) {
        return baseFilter;
    }

    if (typeof baseFilter === 'function') {
        return (pathname: string, req: IncomingMessage): boolean => {
            return baseFilter(pathname, req) && namespaceFilter(pathname, req);
        };
    }

    return (pathname: string, req: IncomingMessage): boolean => {
        const matches = Array.isArray(baseFilter)
            ? baseFilter.some((pattern) => pathname.startsWith(pattern))
            : pathname.startsWith(baseFilter);

        return matches && namespaceFilter(pathname, req);
    };
}

/**
 * Function for proxying UI5 sources.
 *
 * @param config - proxy configuration
 * @param options - additional configuration options
 * @param filter - custom filter function which will be applied to all requests
 * @param logger - optional logger instance
 * @param middlewareUtil - optional middleware utilities
 * @returns Proxy function to use
 */
export const ui5Proxy = (
    config: ProxyConfig,
    options?: Options,
    filter?: Filter,
    logger: ToolsLogger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    }),
    middlewareUtil?: MiddlewareParameters<UI5ProxyConfig>['middlewareUtil']
): RequestHandler => {
    const today = new Date();
    //eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const etag = `W/"${config.version || 'ui5-latest-' + today.getDate() + today.getMonth() + today.getFullYear()}"`;
    const ui5Ver = config.version ? `/${config.version}` : '';

    const proxyFilter = createCombinedProxyFilter(filter, middlewareUtil);

    const proxyConfig: Options = {
        on: {
            proxyReq: (proxyReq: ClientRequest, _req: IncomingMessage, res: ServerResponse): void => {
                proxyRequestHandler(proxyReq, res, etag);
            },
            proxyRes: (proxyRes: IncomingMessage): void => {
                proxyResponseHandler(proxyRes, etag);
            },
            error: (
                err: Error & { code?: string },
                req: IncomingMessage & { next?: Function; originalUrl?: string },
                res: ServerResponse | Socket,
                target: string | Partial<Url> | undefined
            ) => {
                proxyErrorHandler(err, req, logger, res, target);
            }
        },
        target: config.url,
        changeOrigin: true,
        pathRewrite: getPathRewrite(config, ui5Ver),
        pathFilter: proxyFilter,
        ...options
    };

    // update proxy config with values coming from args or ui5.yaml
    updateProxyEnv(config.proxy);
    const corporateProxy = getProxyForUrl(config.url);
    if (corporateProxy) {
        proxyConfig.agent = new HttpsProxyAgent(corporateProxy);
    }

    return createProxyMiddleware(proxyConfig);
};
