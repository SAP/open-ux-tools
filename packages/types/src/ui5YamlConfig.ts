export interface Destination {
    destination: string;
    destinationInstance?: string;
}
export type Backend = Partial<Destination> & {
    path: string;
    url: string;
};

export interface MiddlewareConfig {
    name: string;
    beforeMiddleware?: string;
    afterMiddleware?: string;
    mountPath?: string;
    configuration: {
        port?: number;
        path?: string;
        annotations?: {
            localPath?: string;
            urlPath: string;
        };
        service?: {
            urlBasePath: string;
            name: string;
            metadataXmlPath: string;
            mockdataRootPath?: string;
            generateMockData?: boolean;
        };
        backend?: Backend[];
        ui5?: {
            path: string[];
            url: string;
            version: string | null;
        };
        ignoreCertError?: boolean;
    };
}
// TypeDefs using TypeScript 4.1 feature will break consumer compilation < 4.1
// export { NodeComment, Path } from '@sap/ux-yaml';
