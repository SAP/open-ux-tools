import type { NextFunction } from 'express';
import type { IncomingMessage } from 'http';

import type { UI5ProxyConfig } from '@sap-ux/ui5-config';

export type Ui5MiddlewareConfig = UI5ProxyConfig;

export interface BaseBackendConfig {
    path: string;
    pathPrefix?: string;
    scp?: boolean;
    apiHub?: boolean;
    ws?: boolean;
    xfwd?: boolean;
}

export interface DestinationBackendConfig extends BaseBackendConfig {
    destination: string;
    destinationInstance?: string;
}

export interface LocalBackendConfig extends BaseBackendConfig {
    url: string;
    client?: string;
}

export type BackendConfig = LocalBackendConfig & DestinationBackendConfig;

export interface CommonConfig {
    proxy?: string;
    noProxyList?: string;
    ignoreCertError?: boolean;
    debug?: boolean;

    /**
     * The BSP property for the FLP Embedded Flow. The property refers to the BSP Application Name.
     * In that case, we need to redirect the manifest.appdescr request to the local manifest.json in order to overwrite the deployed application with the local one.
     */
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
