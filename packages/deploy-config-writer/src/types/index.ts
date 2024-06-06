import type { Destination } from '@sap-ux/btp-utils';

export type ServiceType =
    | 'xsuaa'
    | 'destination'
    | 'portal'
    | 'connectivity'
    | 'html5-apps-repo:app-host'
    | 'html5-apps-repo:app-runtime'
    | string;
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
export type ResourceType = ExistingResourceType | ManagedResourceType;
export type ExistingResourceType = 'org.cloudfoundry.existing-service';
export type ManagedResourceType = 'org.cloudfoundry.managed-service';
export type MTADestinationType = Destination & {
    ServiceInstanceName: string;
    ServiceKeyName: string;
    'sap.cloud.service': string;
};
