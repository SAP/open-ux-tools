/**
 * Configuration for a single backend destination.
 */
export interface BackendDestination {
    /**
     * Destination URL to proxy requests to.
     */
    url: string;
    /**
     * Array of OData source paths to proxy to this destination.
     * Each path represents an OData service that should be proxied to the destination URL.
     * Requests matching these paths will have the path prefix removed before forwarding.
     */
    paths: string[];
}

/**
 * Configuration for Cloud Foundry OAuth middleware.
 */
export interface CfOAuthMiddlewareConfig {
    /**
     * Array of backend destinations.
     * Each destination has its own URL and paths.
     */
    backends: BackendDestination[];
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
