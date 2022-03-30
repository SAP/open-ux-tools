import type { SAPJSONSchemaForWebApplicationManifestFile } from './manifest';

export type Manifest = SAPJSONSchemaForWebApplicationManifestFile;
/*
export interface UI5ProxyConfigTarget {
    path: string | string[];
    url: string;
}

export interface UI5ProxyConfig {
    ui5: UI5ProxyConfigTarget | UI5ProxyConfigTarget[];
    proxy?: string;
    debug?: boolean;
    secure?: boolean;
    directLoad?: boolean;
    version?: string;
}
*/
export interface FioriToolsProxyConfigBackend {
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

export interface FioriToolsProxyConfigUI5 {
    path: string[];
    url: string;
    version?: string;
    directLoad?: boolean;
}

export interface FioriToolsProxyConfig {
    backend?: FioriToolsProxyConfigBackend[];
    ui5?: Partial<FioriToolsProxyConfigUI5>;
    ignoreCertError?: boolean;
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
