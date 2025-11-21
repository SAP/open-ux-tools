import type { AuthenticationType } from '@sap-ux/store';
export interface UI5ProxyConfigTarget {
    path: string | string[];
    url: string;
    pathReplace?: string;
}

export interface UI5ProxyConfig {
    ui5: UI5ProxyConfigTarget | UI5ProxyConfigTarget[];
    proxy?: string;
    debug?: boolean;
    secure?: boolean;
    directLoad?: boolean;
    version?: string;
}

export interface FioriToolsProxyConfigBackend {
    path?: string;
    url: string;
    client?: string;
    authenticationType?: AuthenticationType;
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
    /**
     * @deprecated Use ignoreCertErrors (plural) instead
     */
    ignoreCertError?: boolean;
    ignoreCertErrors?: boolean;
}

export interface MockserverService {
    urlPath: string;
    metadataPath: string;
    mockdataPath?: string;
    generateMockData?: boolean;
    resolveExternalServiceReferences?: boolean;
}

export interface MockserverConfig {
    mountPath: string;
    annotations?: {
        localPath?: string;
        urlPath: string;
    }[];
    services?: MockserverService[];
}

export interface FioriToolsServeStaticPath {
    path: string;
    src: string;
    fallthrough?: boolean;
}

export interface FioriToolsServeStaticConfig {
    paths: FioriToolsServeStaticPath[];
}
