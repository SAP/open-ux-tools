export interface MiddlewareConfig {
    name: string;
    afterMiddleware?: string;
    configuration: {
        port: number;
        path: string;
    };
}
