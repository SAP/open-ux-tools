import type { Filter, Options } from 'http-proxy-middleware';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import type { UI5Config } from './types';
import { proxyRequestHandler, proxyResponseHandler, filterCompressedHtmlFiles } from './utils';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

/**
 * Function for proxying UI5 sources.
 *
 * @param config - proxy configuration
 * @param options - additional configuration options
 * @param filter - custom filter function which will be applied to all requests
 * @returns Proxy function to use
 */
export const ui5Proxy = (config: UI5Config, options?: Options, filter?: Filter) => {
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
        }
    };
    Object.assign(proxyConfig, options);
    let proxyFilter: Filter = filterCompressedHtmlFiles;

    if (filter) {
        proxyFilter = filter;
    }

    return createProxyMiddleware(proxyFilter, proxyConfig);
};
