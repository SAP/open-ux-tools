export interface MiddlewareConfig {
    name: string;
    afterMiddleware?: string;
    configuration: {
        port: number;
        path: string;
    };
}

export const getMiddlewareConfig = (): MiddlewareConfig[] => {
    return [
        {
            name: 'fiori-tools-appreload',
            afterMiddleware: 'compression',
            configuration: {
                port: 35729,
                path: 'webapp'
            }
        }
    ];
};
