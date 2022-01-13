import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { UI5Config } from './types';
import { proxyRequestHandler, proxyResponseHandler } from './utils';
import { ToolsLogger } from '@sap-ux/logger';
import { UI5ToolingTransport } from '@sap-ux/logger/dist/transports';

/**
 * Function for proxying UI5 sources.
 *
 * @param config - proxy configuration
 * @param options - additional configuration options
 * @returns Proxy function to use
 */
export const ui5Proxy = (config: UI5Config, options?: Options) => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'ui5-proxy-middleware' })]
    });
    const etag = `W/"${config.version || 'ui5-latest'}"`;
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

    return createProxyMiddleware(proxyConfig);
};
