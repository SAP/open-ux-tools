import { getProxyForUrl } from 'proxy-from-env';
/**
 * Get the effective proxy string from runtime args (highest priority), given config value or environment variables.
 *
 * @param proxyFromConfig - optional proxy string from configuration
 * @returns proxy server if required, otherwise undefined
 */
export function getCorporateProxyServer(proxyFromConfig?: string): string | undefined {
    let proxyFromArgs: string | undefined;
    process.argv.forEach((arg) => {
        if (arg.match(/proxy=/g)) {
            proxyFromArgs = arg.split('=')[1];
        }
    });
    const proxyFromFioriToolsConfig = proxyFromArgs || proxyFromConfig || process.env.FIORI_TOOLS_PROXY;
    const proxyFromOSEnvConfig =
        process.env.http_proxy ||
        process.env.HTTP_PROXY ||
        process.env.https_proxy ||
        process.env.HTTPS_PROXY ||
        process.env.npm_config_proxy ||
        process.env.npm_config_https_proxy;

    if (proxyFromFioriToolsConfig) {
        process.env.http_proxy = proxyFromFioriToolsConfig;
        process.env.HTTP_PROXY = proxyFromFioriToolsConfig;
        process.env.https_proxy = proxyFromFioriToolsConfig;
        process.env.HTTPS_PROXY = proxyFromFioriToolsConfig;
        process.env.npm_config_proxy = proxyFromFioriToolsConfig;
        process.env.npm_config_https_proxy = proxyFromFioriToolsConfig;

        return proxyFromFioriToolsConfig;
    } else {
        return proxyFromOSEnvConfig;
    }
}

/**
 * Checks if a host should be proxied through user's corporate proxy.
 *
 * @param url - url to be checked
 * @returns false if host is excluded from user's corporate server, true otherwise
 */
export const isProxyRequired = (url: string): boolean => {
    return getProxyForUrl(url) ? true : false;
};
