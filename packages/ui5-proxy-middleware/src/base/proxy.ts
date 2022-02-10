import { createProxyMiddleware, Filter, Options } from 'http-proxy-middleware';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { UI5Config } from './types';
import { proxyRequestHandler, proxyResponseHandler } from './utils';
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
        onProxyReq: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse): void => {
            proxyRequestHandler(proxyReq, res, etag, logger);
        },
        pathRewrite: { [config.path]: ui5Ver + config.path },
        onProxyRes: (proxyRes: IncomingMessage): void => {
            proxyResponseHandler(proxyRes, etag);
        }
    };
    Object.assign(proxyConfig, options);

    // Avoid ERR_CONTENT_DECODING_FAILED on http request for gzip'd html files
    // e.g. /test-resources/sap/ui/qunit/testrunner.html?testpage=%2Ftest%2Ftestsuite.qunit.html&autostart=true
    let proxyFilter: Filter = (_pathname: string, req: IncomingMessage): boolean => {
        const acceptHeader = req.headers['accept'] || '';
        if (
            req.headers['accept-encoding'] &&
            (acceptHeader.includes('text/html') || acceptHeader.includes('application/xhtml+xml'))
        ) {
            delete req.headers['accept-encoding']; // Don't accept compressed html files from ui5 CDN
        }
        return true;
    };

    if (filter) {
        proxyFilter = filter;
    }

    return createProxyMiddleware(proxyFilter, proxyConfig);
};
