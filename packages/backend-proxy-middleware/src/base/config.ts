/**
 * Updates the proxy configuration with values from runtime args (highest priority), given config value or environment variables.
 *
 * @param proxyFromConfig - optional proxy string from configuration
 */
export function updateProxyEnv(proxyFromConfig?: string): void {
    let proxyFromArgs: string | undefined;
    process.argv.forEach((arg) => {
        if (arg.match(/proxy=/g)) {
            proxyFromArgs = arg.split('=')[1];
        }
    });

    if (proxyFromArgs || process.env.FIORI_TOOLS_PROXY) {
        process.env.npm_config_proxy = proxyFromArgs || process.env.FIORI_TOOLS_PROXY;
        process.env.npm_config_https_proxy = proxyFromArgs || process.env.FIORI_TOOLS_PROXY;
    } else {
        const proxyFromEnv =
            process.env.npm_config_proxy ||
            process.env.npm_config_https_proxy ||
            process.env.http_proxy ||
            process.env.HTTP_PROXY ||
            process.env.https_proxy ||
            process.env.HTTPS_PROXY;

        if (!proxyFromEnv && proxyFromConfig) {
            process.env.npm_config_proxy = proxyFromConfig;
            process.env.npm_config_https_proxy = proxyFromConfig;
        }
    }
}
