export interface ProxyBackend {
    path?: string;
    url: string;
    destination?: string;
    destinationInstance?: string;
}

export interface ProxyUIConfig {
    path?: string[];
    url?: string;
    version?: string;
}

export interface CustomMiddleware<C extends any> {
    name: string;
    beforeMiddleware?: string;
    afterMiddleware?: string;
    mountPath?: string;
    configuration: C;
}

export interface FioriAppReloadConfig {
    port: number;
    path: string;
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
        urlBasePath: string;
        name: string;
        metadataXmlPath: string;
        mockdataRootPath?: string;
        generateMockData?: boolean;
    };
}
