export interface UI5Config {
    path: string;
    url: string;
    version?: string;
}

export interface ProxyConfig {
    ui5: UI5Config[];
    proxy?: string;
    debug?: boolean;
    secure?: boolean;
    directLoad?: boolean;
    version?: string;
}

export interface MiddlewareParameters<T> {
    resources: object;
    options: {
        configuration: T;
    };
}
