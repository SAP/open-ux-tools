/**
 * Configuration for CF OAuth middleware.
 */
export interface CfOAuthMiddlewareConfig {
    /**
     * Path prefix to match requests (e.g., '/odata')
     * Only requests starting with this path will get Bearer tokens.
     */
    path?: string;
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
