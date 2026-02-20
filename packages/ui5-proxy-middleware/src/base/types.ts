import type { NextFunction } from 'express';
import type { IncomingMessage } from 'node:http';

export interface ProxyConfig {
    /**
     * Path that is to be proxied.
     */
    path: string;
    /**
     * If provided then the path will be replaced with this value before forwarding.
     */
    pathReplace?: string;
    /**
     * The target URL to proxy the request to.
     */
    url: string;
    /**
     * If provided then the proxy will try to load the specified version of UI5 resources.
     */
    version?: string;
    /**
     * If set then it will override the proxy settings from node.
     */
    proxy?: string;
}

export interface UI5ProxyRequest {
    next?: NextFunction;
}
export type ProxyRequest = IncomingMessage & UI5ProxyRequest;
