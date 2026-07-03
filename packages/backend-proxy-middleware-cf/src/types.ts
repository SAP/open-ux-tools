import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Destination configuration for approuter (name must match routes in xs-app.json).
 */
export interface ApprouterDestination {
    /** Destination name used in xs-app.json routes */
    name: string;
    /** URI of the host to proxy to */
    url: string;
}

/**
 * Extension to be required and injected into the local approuter instance.
 */
export interface ApprouterExtension {
    /** Local path (e.g. "./my-extension.js") or module path (e.g. "@scope/package/extension.js") */
    module: string;
    /** Optional parameters injected into the extension handler as 4th argument */
    parameters?: Record<string, string>;
}

/**
 * Configuration for the backend-proxy-middleware-cf (approuter-based).
 * Options are merged with defaults; configuration can be partial.
 */
export interface BackendProxyMiddlewareCfConfig {
    /** Verbose logging */
    debug?: boolean;
    /** Port to run the underlying approuter on */
    port?: number;
    /** Path to xs-app.json (relative to project root). Defaults to './xs-app.json'. */
    xsappJsonPath?: string;
    /** Path to the environment options file (relative to project root) */
    envOptionsPath?: string;
    /** Destinations: array of { name, url } (e.g. from default-env.json). Destination names must match routes in xs-app.json. */
    destinations?: ApprouterDestination[] | string;
    /** Allow BTP services configured in xs-app.json (requires authenticated BTP session) */
    allowServices?: boolean;
    /** Authentication method for routes */
    authenticationMethod?: 'none' | 'route';
    /** Allow static assets to be served by approuter (default false; usually ui5-server serves them) */
    allowLocalDir?: boolean;
    /** Subdomain for multitenancy (optional) */
    subdomain?: string | null;
    /** Replace proxied URL in response body with server URL */
    rewriteContent?: boolean;
    /** Content types to rewrite when rewriteContent is true */
    rewriteContentTypes?: string[];
    /** Approuter extensions (module path + optional parameters) */
    extensions?: ApprouterExtension[];
    /** Add route for HTML pages to trigger XSUAA login when authenticationMethod !== 'none' */
    appendAuthRoute?: boolean;
    /** Disable welcome file handling from xs-app.json */
    disableWelcomeFile?: boolean;
    /** Disable automatic injection of ui5-server routes (resources, test-resources, catch-all) */
    disableUi5ServerRoutes?: boolean;
    /** Disable SSH tunnel to connectivity proxy for OnPremise destinations */
    disableSshTunnel?: boolean;
    /** CF app name used as SSH tunnel target */
    tunnelAppName?: string;
    /** Local port for the SSH tunnel (defaults to connectivity proxy port) */
    tunnelLocalPort?: number;
    /** Skip cf enable-ssh and cf restart (assume SSH is already enabled on the tunnel app) */
    skipSshEnable?: boolean;
}

/** Effective options with defaults applied. */
export interface EffectiveOptions extends BackendProxyMiddlewareCfConfig {
    port: number;
    xsappJsonPath: string;
    destinations: ApprouterDestination[];
    rewriteContentTypes: string[];
    extensions: ApprouterExtension[];
}

/** Route entry with compiled regex and resolved destination URL. */
export interface RouteEntry {
    sourcePattern: RegExp;
    path: string;
    url?: string;
    source: string;
    destination?: string;
}

/** Mime info for response handling. */
export interface MimeInfo {
    type: string;
    charset: string;
    contentType: string;
}

/** Single route entry in xs-app.json (minimal shape we use). */
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

/** Parsed xs-app.json shape (minimal for our use). */
export interface XsappConfig {
    routes?: XsappRoute[];
    welcomeFile?: string;
    authenticationMethod?: string;
    login?: { callbackEndpoint?: string };
    logout?: { logoutEndpoint?: string };
}

/**
 * Options for building RouteEntry[] from a prepared xsappConfig
 */
export interface BuildRouteEntriesOptions {
    xsappConfig: XsappConfig;
    effectiveOptions: EffectiveOptions;
    logger: ToolsLogger;
}

/**
 * Options for loading and preparing xs-app.json (no destinations needed)
 */
export interface PrepareXsappConfigOptions {
    rootPath: string;
    xsappJsonPath: string;
    effectiveOptions: EffectiveOptions;
    sourcePath: string;
    logger: ToolsLogger;
}

/** Options for creating the proxy middleware. */
export interface CreateProxyOptions {
    /** Path patterns to proxy (e.g. '/', '/login/callback', logout endpoint). */
    customRoutes: string[];
    /** Route entries from xs-app (regex + destination URL). */
    routes: RouteEntry[];
    /** Target base URI (e.g. http://localhost:port). */
    baseUri: string;
    /** Merged options (debug, rewriteContent, etc.). */
    effectiveOptions: EffectiveOptions;
    /** External URL for BAS (from exposePort). Overrides x-forwarded-host/proto in proxy requests. */
    basExternalUrl?: URL;
}

/**
 * Connectivity proxy coordinates from VCAP_SERVICES.
 */
export interface ConnectivityProxyInfo {
    host: string;
    port: number;
}

/**
 * Options for the SSH tunnel setup.
 */
export interface SshTunnelOptions {
    /** Local port to bind the tunnel to (defaults to remotePort). */
    localPort?: number;
    /** Skip cf enable-ssh and cf restart (assume SSH is already enabled). */
    skipSshEnable?: boolean;
}

/**
 * Approuter extension handler: Express-like (req, res, next) with optional 4th params from config
 */
export type ExtensionHandler = (req: unknown, res: unknown, next: unknown, params?: Record<string, string>) => void;

/**
 * Extension module shape expected from approuter extensions
 */
export interface ExtensionModule {
    insertMiddleware?: Record<string, Array<ExtensionHandler | { path?: string; handler: ExtensionHandler }>>;
}

/**
 * Loaded extension modules and list of extension routes (paths) they register.
 */
export interface LoadedExtensions {
    modules: ExtensionModule[];
    routes: string[];
}
