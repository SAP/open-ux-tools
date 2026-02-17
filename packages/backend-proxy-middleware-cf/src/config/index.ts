import type { BackendProxyMiddlewareCfConfig, ApprouterDestination, ApprouterExtension } from '../types';

/**
 * Effective options with defaults applied (used internally)
 */
export interface EffectiveOptions extends BackendProxyMiddlewareCfConfig {
    port: number;
    xsappJson: string;
    destinations: ApprouterDestination[] | string;
    rewriteContentTypes: string[];
    extensions: ApprouterExtension[];
}

/**
 * Route entry with compiled regex and resolved destination URL
 */
export interface RouteEntry {
    re: RegExp;
    path: string;
    url?: string;
    source: string;
    destination?: string;
}

/**
 * Mime info for response handling
 */
export interface MimeInfo {
    type: string;
    charset: string;
    contentType: string;
}

/**
 * Single route entry in xs-app.json (minimal shape we use)
 */
export interface XsappRoute {
    source: string;
    destination?: string;
    endpoint?: string;
    localDir?: string;
    service?: string;
    authenticationType?: string;
    target?: string;
    cacheControl?: string;
}

/**
 * Parsed xs-app.json shape (minimal for our use)
 */
export interface XsappConfig {
    routes?: XsappRoute[];
    welcomeFile?: string;
    authenticationMethod?: string;
    login?: { callbackEndpoint?: string };
    logout?: { logoutEndpoint?: string };
}

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
