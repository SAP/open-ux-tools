import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { ToolsLogger } from '@sap-ux/logger';

/**
 * Handler for the proxy response event.
 * Sets an Etag which will be used for re-validation of the cached UI5 sources.
 *
 * @param proxyRes - proxy response object
 * @param etag - ETag for the cached sources, normally the UI5 version
 */
export const proxyResponseHandler = (proxyRes: IncomingMessage, etag: string): void => {
    proxyRes.headers['Etag'] = etag;
    proxyRes.headers['cache-control'] = 'no-cache';
};

/**
 * Handler for the proxy request event.
 * Re-validates the cached UI5 sources based on the ETag.
 * Logs the requests made by the proxy.
 *
 * @param proxyReq - proxy request object
 * @param res - server response object
 * @param etag - Etag of the cached UI5 sources, normally the UI5 version
 * @param logger - Logger for loging the requests
 */
export const proxyRequestHandler = (
    proxyReq: ClientRequest,
    res: ServerResponse,
    etag: string,
    logger: ToolsLogger
): void => {
    logger.info(proxyReq.path);
    if (proxyReq.getHeader('if-none-match') === etag) {
        res.statusCode = 304;
        res.end();
    }
};

/**
 * Get user's proxy configuration.
 *
 * @param yamlProxyServer - proxy server config from yaml file
 * @returns User's proxy configuration or undefined
 */
export const getCorporateProxyServer = (yamlProxyServer: string | undefined): string | undefined => {
    return (
        yamlProxyServer ||
        process.env.FIORI_TOOLS_PROXY ||
        process.env.http_proxy ||
        process.env.HTTP_PROXY ||
        process.env.https_proxy ||
        process.env.HTTPS_PROXY ||
        process.env.npm_config_proxy ||
        process.env.npm_config_https_proxy
    );
};

/**
 * Checks if a host is excluded from user's corporate proxy.
 *
 * @param noProxyConfig - user's no_proxy configuration
 * @param host - host to be checked
 * @returns true if host is excluded from user's corporate server, false otherwise
 */
export const isHostExcludedFromProxy = (noProxyConfig: string | undefined, host: string): boolean => {
    const noProxyList = noProxyConfig ? noProxyConfig.split(',') : [];
    const found = noProxyList.find((entry) => {
        return host.includes(entry);
    });
    return !!found;
};
