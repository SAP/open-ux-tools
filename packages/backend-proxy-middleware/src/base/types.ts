import type { NextFunction } from 'express';
import type { IncomingMessage } from 'http';

import type { UI5ProxyConfig } from '@sap-ux/ui5-config';

export type Ui5MiddlewareConfig = UI5ProxyConfig;

export interface BackendConfig {
    path: string;
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

export interface CommonConfig {
    proxy?: string;
    noProxyList?: string;
    ignoreCertError?: boolean;
    debug?: boolean;
    bsp?: string;
}

export interface ProxyConfig extends CommonConfig {
    backend: BackendConfig[];
}

export interface MiddlewareParameters<T> {
    resources: object;
    options: {
        configuration: T;
    };
}

export interface UI5ProxyRequest {
    next?: NextFunction;
}
export type ProxyRequest = IncomingMessage & UI5ProxyRequest;
