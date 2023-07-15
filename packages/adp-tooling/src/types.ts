import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { AxiosRequestConfig } from '@sap-ux/axios-extension';
import type { ServiceInfo } from '@sap-ux/btp-utils';

export interface DescriptorVariant {
    layer: UI5FlexLayer;
    reference: string;
    id: string;
    namespace: string;
    content: object[];
}

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

    /**
     * If set to true only only servers with validated identities are accepted
     */
    strictSsl?: boolean;
}