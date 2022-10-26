import type { NextFunction } from 'express';
import type { IncomingMessage } from 'http';

import type { UI5ProxyConfig } from '@sap-ux/ui5-config';

export type Ui5MiddlewareConfig = UI5ProxyConfig;

export interface ProxyConfig {
    path: string;
    url: string;
    version?: string;
    proxy?: string;
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
