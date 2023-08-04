import type { AxiosRequestConfig, ServiceInfo } from '@sap-ux/axios-extension';

export interface UrlAbapTarget {
    url: string;
    client?: string;
    service?: string;
    cloud?: boolean;
    serviceKey?: ServiceInfo;
    params?: AxiosRequestConfig['params'];
}

export interface DestinationAbapTarget {
    destination: string;
}

export type AbapTarget =
    | (UrlAbapTarget & Partial<DestinationAbapTarget>)
    | (DestinationAbapTarget & Partial<UrlAbapTarget>);
