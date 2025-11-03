/**
 * Configuration for Cloud Foundry OAuth middleware.
 */
export interface CfOAuthMiddlewareConfig {
    /**
     * Path prefixes to match requests (e.g., ['/odata/v4', '/odata/v2']).
     * Only requests starting with these paths will get Bearer tokens.
     */
    paths?: string[];
    /**
     * Manual OAuth credentials (optional).
     * If not provided, middleware will attempt to auto-detect from Cloud Foundry ADP project.
     */
    credentials?: {
        /**
         * OAuth2 client ID.
         */
        clientId: string;
        /**
         * OAuth2 client secret.
         */
        clientSecret: string;
        /**
         * Base URL for the OAuth token endpoint.
         * The token endpoint will be constructed as: {url}/oauth/token
         */
        url: string;
    };
    /**
     * Enable debug logging.
     */
    debug?: boolean;
}

export interface MiddlewareParameters<T> {
    resources: object;
    options: {
        configuration: T;
    };
}
