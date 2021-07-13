import { MiddlewareConfig } from '@sap/ux-ui5-config';

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
