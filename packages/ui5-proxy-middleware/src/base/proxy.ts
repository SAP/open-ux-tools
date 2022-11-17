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
import type { Url } from 'url';
import { getProxyForUrl } from 'proxy-from-env';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * Function for proxying UI5 sources.
 *
 * @param config - proxy configuration
 * @param options - additional configuration options
 * @param filter - custom filter function which will be applied to all requests
 * @returns Proxy function to use
 */
export const ui5Proxy = (config: ProxyConfig, options?: Options, filter?: Filter) => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    });
    const today = new Date();
    const etag = `W/"${config.version || 'ui5-latest-' + today.getDate() + today.getMonth() + today.getFullYear()}"`;
    const ui5Ver = config.version ? `/${config.version}` : '';
    const proxyConfig: Options = {
        target: config.url,
        changeOrigin: true,
        onProxyReq: (proxyReq: ClientRequest, _req: IncomingMessage, res: ServerResponse): void => {
            proxyRequestHandler(proxyReq, res, etag, logger);
        },
        pathRewrite: { [config.path]: ui5Ver + config.path },
        onProxyRes: (proxyRes: IncomingMessage): void => {
            proxyResponseHandler(proxyRes, etag);
        },
        onError: (
            err: Error & { code?: string },
            req: IncomingMessage & { next?: Function; originalUrl?: string },
            res: ServerResponse,
            target: string | Partial<Url> | undefined
        ) => {
            proxyErrorHandler(err, req, logger, res, target);
        }
    };

    // update proxy config with values coming from args or ui5.yaml
    updateProxyEnv(config.proxy);
    const corporateProxy = getProxyForUrl(config.url);
    if (corporateProxy) {
        proxyConfig.agent = new HttpsProxyAgent(corporateProxy);
    }

    Object.assign(proxyConfig, options);
    let proxyFilter: Filter = filterCompressedHtmlFiles;

    if (filter) {
        proxyFilter = filter;
    }

    return createProxyMiddleware(proxyFilter, proxyConfig);
};
