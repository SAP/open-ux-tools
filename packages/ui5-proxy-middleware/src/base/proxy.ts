import type { Filter, Options } from 'http-proxy-middleware';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import type { ProxyConfig } from './types';
import {
    proxyRequestHandler,
    proxyResponseHandler,
    filterCompressedHtmlFiles,
    proxyErrorHandler,
    updateProxyEnv
} from './utils';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { Url } from 'node:url';
import { getProxyForUrl } from 'proxy-from-env';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { Socket } from 'node:net';

/**
 * Function for proxying UI5 sources.
 *
 * @param config - proxy configuration
 * @param options - additional configuration options
 * @param filter - custom filter function which will be applied to all requests
 * @param logger - optional logger instance
 * @returns Proxy function to use
 */
export const ui5Proxy = (
    config: ProxyConfig,
    options?: Options,
    filter?: Filter,
    logger: ToolsLogger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    })
) => {
    const today = new Date();
    const etag = `W/"${config.version || 'ui5-latest-' + today.getDate() + today.getMonth() + today.getFullYear()}"`;
    const ui5Ver = config.version ? `/${config.version}` : '';

    let proxyFilter: Filter = filterCompressedHtmlFiles;

    if (filter) {
        proxyFilter = filter;
    }

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
        pathRewrite: (path: string, _req) => {
            return path.startsWith(config.path) ? ui5Ver + path : ui5Ver + config.path + path;
        },
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
