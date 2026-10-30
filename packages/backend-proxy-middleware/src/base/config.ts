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
        process.env.http_proxy = proxyFromArgs || process.env.FIORI_TOOLS_PROXY;
        process.env.https_proxy = proxyFromArgs || process.env.FIORI_TOOLS_PROXY;
    } else {
        const proxyFromEnv =
            process.env.http_proxy ||
            process.env.HTTP_PROXY ||
            process.env.https_proxy ||
            process.env.HTTPS_PROXY ||
            process.env.all_proxy ||
            process.env.ALL_PROXY;

        // proxy-from-env@2 no longer reads npm_config_*; promote legacy .npmrc proxy into standard vars.
        const legacyNpmProxy = process.env.npm_config_proxy || process.env.npm_config_https_proxy;
        const fallback = proxyFromEnv ? undefined : legacyNpmProxy || proxyFromConfig;
        if (fallback) {
            process.env.http_proxy = fallback;
            process.env.https_proxy = fallback;
        }
    }
}
