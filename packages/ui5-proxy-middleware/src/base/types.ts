import type { LogLevel } from '@sap-ux/logger';
import type { NextFunction } from 'express';
import type { IncomingMessage } from 'http';

export interface ProxyConfig {
    path: string;
    url: string;
    version?: string;
    proxy?: string;
    logLevel?: LogLevel;
}

export interface UI5ProxyRequest {
    next?: NextFunction;
}
export type ProxyRequest = IncomingMessage & UI5ProxyRequest;
