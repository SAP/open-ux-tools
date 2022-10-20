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
    const proxyFromFioriToolsConfig = proxyFromArgs || proxyFromConfig || process.env.FIORI_TOOLS_PROXY;

    if (proxyFromFioriToolsConfig) {
        process.env.npm_config_proxy = proxyFromFioriToolsConfig;
        process.env.npm_config_https_proxy = proxyFromFioriToolsConfig;
    }
}
