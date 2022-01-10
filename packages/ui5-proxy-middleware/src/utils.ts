import { IncomingMessage } from 'http';
import { getLogger } from '@ui5/logger';

export const logger = getLogger('sap-ux:ui5-proxy-middleware');

export const proxyResponseHandler = (proxyRes: IncomingMessage, etag: string): void => {
    /*
     Enables re-validation of cached ui5 source.
     The re-validation is performed by an ETag, which is normally the UI5 version.
    */
    proxyRes.headers['Etag'] = etag;
    proxyRes.headers['cache-control'] = 'no-cache';
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

export const isHostExcludedFromProxy = (noProxyConfig: string | undefined, host: string): boolean => {
    const noProxyList = noProxyConfig ? noProxyConfig.split(',') : [];
    const found = noProxyList.find((entry) => {
        return host.includes(entry);
    });
    return !!found;
};
