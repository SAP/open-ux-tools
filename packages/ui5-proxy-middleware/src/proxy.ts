import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { UI5Config } from './types';
import { proxyResponseHandler, logger } from './utils';

export const ui5Proxy = (config: UI5Config, options?: Options) => {
    const etag = `W/"${config.version || 'ui5-latest'}"`;
    const ui5Ver = config.version ? `/${config.version}` : '';
    const proxyConfig: Options = {
        target: config.url,
        changeOrigin: true,
        onProxyReq: (proxyReq: ClientRequest, req: IncomingMessage, res: ServerResponse): void => {
            logger.info(proxyReq.path);
            if (proxyReq.getHeader('if-none-match') === etag) {
                res.statusCode = 304;
                res.end();
            }
        },
        pathRewrite: { [config.path]: ui5Ver + config.path },
        onProxyRes: (proxyRes: IncomingMessage): void => {
            proxyResponseHandler(proxyRes, etag);
        }
    };
    Object.assign(proxyConfig, options);

    return createProxyMiddleware(proxyConfig);
};
