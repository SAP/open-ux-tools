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

export interface MockserverConfig {
    mountPath: string;
    annotations?: {
        localPath?: string;
        urlPath: string;
    }[];
    services?: {
        urlPath: string;
        metadataPath: string;
        mockdataPath?: string;
        generateMockData?: boolean;
    }[];
}
