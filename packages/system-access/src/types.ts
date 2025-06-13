import type { AbapServiceProvider, AxiosRequestConfig, ServiceInfo } from '@sap-ux/axios-extension';
import type { AuthenticationType } from '@sap-ux/store';

export interface UrlAbapTarget {
    url: string;
    client?: string;
    scp?: boolean;
    authenticationType?: AuthenticationType;
    serviceKey?: ServiceInfo;
    params?: AxiosRequestConfig['params'];
}

export interface DestinationAbapTarget {
    destination: string;
}

export type AbapTarget =
    | (UrlAbapTarget & Partial<DestinationAbapTarget>)
    | (DestinationAbapTarget & Partial<UrlAbapTarget>);

export interface Credentials {
    username?: string;
    password?: string;
}

export interface ConnectionTestResult {
    needsCreds?: boolean;
    error?: string;
    warning?: string;
}

export interface SystemConnection {
    authenticated: boolean;
    serviceProvider: AbapServiceProvider;
}
