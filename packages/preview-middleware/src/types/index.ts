import type { AxiosRequestConfig } from '@sap-ux/axios-extension';
import type { ServiceInfo } from '@sap-ux/btp-utils';

export interface UrlAbapTarget {
    url: string;
    client?: string;
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

export interface AdaptationProjectConfig {
    target: AbapTarget;
    credentials?: AxiosRequestConfig['auth'];

    /**
     * If set to true only only servers with validated identities are accepted
     */
    strictSsl?: boolean;
}

/**
 * Configuration for additional applications
 */
export interface App {
    target: string;
    local: string;
    intent?: {
        object: string;
        action: string;
    };
}

/**
 * FLP preview configuration.
 */
export interface FlpConfig {
    path: string;
    apps: App[];
}

/**
 * Middleware configuration.
 */
export interface Config {
    flp?: Partial<FlpConfig>;
    adp?: AdaptationProjectConfig;
    debug?: boolean;
}
