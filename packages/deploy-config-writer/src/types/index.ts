import type { Destination } from '@sap-ux/btp-utils';

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
