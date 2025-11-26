/**
 * Configuration for Cloud Foundry OAuth middleware.
 */
export interface CfOAuthMiddlewareConfig {
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
