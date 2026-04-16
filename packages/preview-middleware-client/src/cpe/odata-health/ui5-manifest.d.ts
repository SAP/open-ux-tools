// Type definitions for @ui5/manifest under NodeNext module resolution
// The @ui5/manifest package doesn't have proper exports, so we need to declare the module here

declare module '@ui5/manifest' {
    export interface SAPJSONSchemaForWebApplicationManifestFile {
        _version?: string;
        'sap.app'?: {
            id?: string;
            type?: string;
            applicationVersion?: {
                version?: string;
            };
            dataSources?: Record<string, DataSource>;
            [key: string]: any;
        };
        'sap.ui5'?: {
            models?: Record<string, any>;
            [key: string]: any;
        };
        [key: string]: any;
    }

    export interface DataSource {
        uri?: string;
        type?: string;
        settings?: {
            odataVersion?: string;
            localUri?: string;
            [key: string]: any;
        };
        [key: string]: any;
    }
}
