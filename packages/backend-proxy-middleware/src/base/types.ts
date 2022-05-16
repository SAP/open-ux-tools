import type { NextFunction } from 'express';
import type { IncomingMessage } from 'http';
import type { Options } from 'http-proxy-middleware';

export interface BaseBackendConfig {
    path: string;
    client?: string;
    pathPrefix?: string;
    scp?: boolean;
    apiHub?: boolean;
    proxy?: string;
    /**
     * The BSP property for the FLP Embedded Flow. The property refers to the BSP Application Name.
     * In that case, we need to redirect the manifest.appdescr request to the local manifest.json in order to overwrite the deployed application with the local one.
     */
    bsp?: string;
}

export interface DestinationBackendConfig extends BaseBackendConfig {
    destination: string;
    destinationInstance?: string;
}

export interface LocalBackendConfig extends BaseBackendConfig {
    url: string;
}

export type BackendConfig = LocalBackendConfig | DestinationBackendConfig;

export interface Ui5MiddlewareConfig {
    backend: BackendConfig;
    options?: Partial<Options>;
    debug?: boolean;
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
