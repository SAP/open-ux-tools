import type { Destination, Authentication } from '@sap-ux/btp-utils';

export type ResourceType =
    | 'xsuaa'
    | 'destination'
    | 'portal'
    | 'connectivity'
    | 'managed:xsuaa'
    | 'html5-apps-repo:app-host'
    | 'html5-apps-repo:app-runtime';
export type ModuleType =
    | 'hdb'
    | 'nodejs'
    | 'java'
    | 'approuter.nodejs'
    | 'com.sap.application.content'
    | 'com.sap.application.content:destination'
    | 'com.sap.application.content:resource'
    | 'html5'
    | 'com.sap.portal.content';
export type CloudFoundryServiceType = ExistingServiceType | ManagedServiceType;
export type ExistingServiceType = 'org.cloudfoundry.existing-service';
export type ManagedServiceType = 'org.cloudfoundry.managed-service';
export type MTADestinationType = Destination & {
    ServiceInstanceName: string;
    ServiceKeyName: string;
    'sap.cloud.service': string;
};
export interface CFWriterConfig {
    addManagedApprouter?: boolean;
    overwrite?: boolean;
    destination: string;
    apiHubConfig?: ApiHubConfig;
    addMTADestination?: boolean;
}

export interface CFConfig extends CFWriterConfig {
    appPath: string;
    capRoot: string;
    isCap: boolean;
    rootPath: string;
    lcapMode: boolean;
    useAbapDirectSrvBinding: boolean;
    serviceBase: string;
    servicePath: string;
    firstServicePathSegment: string;
    appId: string;
    mtaPath?: string;
    isFullUrlDest: boolean;
    destinationAuthType: Authentication;
    cloudServiceName?: string;
    addMTADestination?: boolean;
    mtaId?: string;
}

export const enum ApiHubType {
    apiHub = 'API_HUB',
    apiHubEnterprise = 'API_HUB_ENTERPRISE'
}

export interface ApiHubConfig {
    apiHubKey: string;
    apiHubType: ApiHubType;
}
