import type { BackendProxyMiddlewareCfConfig, EffectiveOptions } from '../types';

export const DEFAULT_REWRITE_CONTENT_TYPES = [
    'text/html',
    'application/json',
    'application/atom+xml',
    'application/xml'
];

/**
 * Merge user configuration with defaults.
 *
 * @param {BackendProxyMiddlewareCfConfig} configuration - Configuration from ui5.yaml.
 * @returns {EffectiveOptions} Effective options with all defaults applied.
 */
export function mergeEffectiveOptions(configuration: BackendProxyMiddlewareCfConfig): EffectiveOptions {
    return {
        debug: false,
        port: 5000,
        xsappJson: './xs-app.json',
        destinations: [],
        allowServices: false,
        authenticationMethod: 'none',
        allowLocalDir: false,
        rewriteContent: true,
        rewriteContentTypes: [...DEFAULT_REWRITE_CONTENT_TYPES],
        appendAuthRoute: false,
        disableWelcomeFile: false,
        extensions: [],
        ...configuration
    } as EffectiveOptions;
}
