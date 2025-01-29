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
export enum CloudFoundryServiceType {
    Existing = 'org.cloudfoundry.existing-service',
    Managed = 'org.cloudfoundry.managed-service'
}
export type MTADestinationType = Destination & {
    ServiceInstanceName: string;
    ServiceKeyName: string;
    'sap.cloud.service': string;
};
export enum RouterModuleType {
    Standard = 'standard',
    Managed = 'managed'
}
export interface MTABaseConfig {
    mtaId: string;
    mtaPath: string;
    mtaDescription?: string;
    mtaVersion?: string;
}
export interface CFBaseConfig extends MTABaseConfig {
    routerType: RouterModuleType;
    addConnectivityService?: boolean;
    abapServiceProvider?: {
        abapServiceName?: string;
        abapService?: string;
    };
}
export interface CFAppConfig {
    appPath: string;
    addManagedAppRouter?: boolean; // Enabled by default
    destinationName?: string;
    apiHubConfig?: ApiHubConfig;
    serviceHost?: string; // Data service host
    lcapMode?: boolean;
    addMtaDestination?: boolean; // Used during headless flow, support toggling on/off destination being added
    cloudServiceName?: string; // Used during headless flow
    destinationAuthentication?: Authentication;
    isDestinationFullUrl?: boolean; // If WebIDEAdditionalData contains full_url, false by default
}
export interface CFConfig extends CFAppConfig, CFBaseConfig {
    appId: string;
    rootPath: string;
    serviceHost: string;
    capRoot?: string;
    isCap?: boolean;
    servicePath?: string;
    firstServicePathSegment?: string;
    isMtaRoot?: boolean;
}
export interface CAPConfig extends Omit<CFBaseConfig, 'abapServiceProvider'> {}
export const enum ApiHubType {
    apiHub = 'API_HUB',
    apiHubEnterprise = 'API_HUB_ENTERPRISE'
}
export interface ApiHubConfig {
    apiHubKey: string;
    apiHubType: ApiHubType;
}
export interface XSAppRoute {
    source?: string;
    target?: string;
    destination?: string;
    csrfProtection?: boolean;
    scope?: string;
    service?: string;
    endpoint?: string;
    authenticationType?: string;
    dependency?: string;
}
export type XSAppRouteProperties = keyof XSAppRoute;
export interface XSAppDocument {
    authenticationMethod?: string;
    routes?: XSAppRoute[];
    welcomeFile?: string;
}
export interface HTML5App {
    path: string;
    'build-parameters': {
        builder: string;
        'build-result': string;
        commands: string[];
        'supported-platforms': string[];
    };
    name: string;
    type: string;
}
