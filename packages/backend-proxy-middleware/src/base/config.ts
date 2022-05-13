import type { BackendConfig, ProxyConfig } from './types';
import dotenv from 'dotenv';

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
    return (
        proxyFromArgs ||
        proxyFromConfig ||
        process.env.FIORI_TOOLS_PROXY ||
        process.env.http_proxy ||
        process.env.HTTP_PROXY ||
        process.env.https_proxy ||
        process.env.HTTPS_PROXY ||
        process.env.npm_config_proxy ||
        process.env.npm_config_https_proxy
    );
}

/**
 * Checks if a host is excluded from user's corporate proxy.
 *
 * @param noProxyConfig - user's no_proxy configuration
 * @param url - url to be checked
 * @returns true if host is excluded from user's corporate server, false otherwise
 */
export const isHostExcludedFromProxy = (noProxyConfig: string | undefined, url: string): boolean => {
    if (noProxyConfig === '*') {
        return true;
    } else {
        const host = new URL(url).host;
        const noProxyList = noProxyConfig ? noProxyConfig.split(',') : [];
        return !!noProxyList.find((entry) =>
            entry.startsWith('.') ? host.endsWith(entry) : host.endsWith(`.${entry}`)
        );
    }
};

/**
 * Get effective configuration. This merges input values and environment variables (process.env) into an effective configuration to work with.
 *
 * @param config - configuration provided as input (e.g. from ui5.yaml)
 * @returns proxy configuration with merged values
 */
export function mergeConfigWithEnvVariables(config: ProxyConfig): ProxyConfig {
    const mergedConfig = JSON.parse(JSON.stringify(config));
    dotenv.config();

    if (process.env.FIORI_TOOLS_BACKEND_CONFIG) {
        mergedConfig.backend = JSON.parse(process.env.FIORI_TOOLS_BACKEND_CONFIG) as BackendConfig[];
    }

    mergedConfig.proxy = getCorporateProxyServer(config.proxy);

    mergedConfig.noProxyList = process.env.no_proxy || process.env.npm_config_noproxy;

    mergedConfig.secure = config.secure !== undefined ? !!config.secure : true;

    return mergedConfig;
}
