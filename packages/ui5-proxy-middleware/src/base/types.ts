import type { NextFunction } from 'express';
import type { IncomingMessage } from 'http';

export interface UI5Config {
    path: string;
    url: string;
    version?: string;
}

export interface UI5ConfigObject {
    path: string[];
    url: string;
    version?: string;
}
export interface ProxyConfig {
    ui5: UI5Config[] | UI5ConfigObject;
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

export interface UI5ProxyRequest {
    next?: NextFunction;
}
export type ProxyRequest = IncomingMessage & UI5ProxyRequest;
