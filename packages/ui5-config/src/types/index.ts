import type { SAPJSONSchemaForWebApplicationManifestFile } from './manifest';

export type Manifest = SAPJSONSchemaForWebApplicationManifestFile;

export interface ProxyBackend {
    path?: string;
    url: string;
    client?: string;
    destination?: string;
    destinationInstance?: string;
    pathPrefix?: string;
    scp?: boolean;
    apiHub?: boolean;
    ws?: boolean;
    xfwd?: boolean;
}

export interface ProxyUIConfig {
    [key: string]: unknown | undefined;
    path?: string[];
    url?: string;
    directLoad?: boolean;
}

export interface CustomMiddleware<C> {
    name: string;
    beforeMiddleware?: string;
    afterMiddleware?: string;
    mountPath?: string;
    configuration: C;
}

export interface CustomTask<C> {
    name: string;
    beforeTask?: string;
    afterTask?: string;
    configuration: C;
}

export interface AbapApp {
    name: string;
    desription: string;
    package: string;
    transport: string;
}

export interface AbapTarget {
    [key: string]: string | boolean | undefined;
    url?: string;
    client?: string;
    destination?: string;
    scp?: boolean;
}

export interface AbapDeployConfig {
    target: AbapTarget;
    app: AbapApp;
}

export interface FioriAppReloadConfig {
    port: number;
    path: string;
    delay: number;
}

export interface FioriToolsProxyConfig {
    backend?: ProxyBackend[];
    ui5?: ProxyUIConfig;
    ignoreCertError?: boolean;
}

export interface MockserverConfig {
    annotations?: {
        localPath?: string;
        urlPath: string;
    };
    service?: {
        urlPath: string;
        metadataXmlPath: string;
        mockdataRootPath?: string;
        generateMockData?: boolean;
    };
}
