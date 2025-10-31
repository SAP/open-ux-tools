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
     * If not provided, middleware will attempt to auto-detect from CF ADP project.
     */
    credentials?: {
        clientId: string;
        clientSecret: string;
        tokenEndpoint: string;
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
