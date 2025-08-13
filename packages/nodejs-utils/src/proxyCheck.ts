export enum ProxyValidationStatus {
    NO_PROXY = 'no-proxy',
    MATCH = 'match',
    MISMATCH = 'mismatch',
    ENV_ONLY = 'env-only',
    PARAM_ONLY = 'param-only'
}

export interface ProxyValidationResult {
    isValid: boolean;
    status: ProxyValidationStatus;
    message: string;
    envProxy?: string;
    providedProxy?: string;
}

const PROXY_ENV_VARS = ['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy'] as const;

const getEnvProxy = (): string | undefined => {
    for (const envVar of PROXY_ENV_VARS) {
        const value = process.env[envVar];
        if (value && value.trim() !== '') {
            return value;
        }
    }
    return undefined;
};

const normalizeProxy = (value?: string): string | undefined => {
    return value?.trim().toLowerCase().replace(/\/+$/, '') || undefined;
};

/**
 * Validates if the proxy settings match against the process.env proxy settings. Typically used to ensure that the proxy settings in VSCode match those in the environment.
 * @param {string} [proxy] - The proxy setting to validate. If not provided, it will check the environment variables.
 * @returns {ProxyValidationResult} - An object containing the validation result, status, and messages.
 */
export function validateProxySettings(proxy?: string): ProxyValidationResult {
    const envProxy = getEnvProxy();
    const normalizedEnvProxy = normalizeProxy(envProxy);
    const normalizedProxy = normalizeProxy(proxy);

    // Exit early if no proxy settings are provided
    if (!(normalizedEnvProxy || normalizedProxy)) {
        return {
            isValid: true,
            status: ProxyValidationStatus.NO_PROXY,
            message: 'No proxy settings configured.',
            providedProxy: undefined,
            envProxy: envProxy
        };
    }

    // Only environment proxy is set
    if (normalizedEnvProxy && !normalizedProxy) {
        return {
            isValid: false,
            status: ProxyValidationStatus.ENV_ONLY,
            message: 'Using environment proxy settings.',
            envProxy: normalizedEnvProxy,
            providedProxy: undefined
        };
    }

    // Only provided proxy is set
    if (!normalizedEnvProxy && normalizedProxy) {
        return {
            isValid: false,
            status: ProxyValidationStatus.PARAM_ONLY,
            message: `Using provided (${normalizedProxy}) proxy settings.`,
            envProxy: undefined,
            providedProxy: normalizedProxy
        };
    }

    // Both exist and match
    if (normalizedEnvProxy === normalizedProxy) {
        return {
            isValid: true,
            status: ProxyValidationStatus.MATCH,
            message: `Proxy settings match.`,
            envProxy: normalizedEnvProxy,
            providedProxy: normalizedProxy
        };
    }

    // Both exist but don't match
    return {
        isValid: false,
        status: ProxyValidationStatus.MISMATCH,
        message: `Proxy settings conflict between environment (${normalizedEnvProxy}) and parameter (${normalizedProxy}).`,
        envProxy: normalizedEnvProxy,
        providedProxy: normalizedProxy
    };
}
