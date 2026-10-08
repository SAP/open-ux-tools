/**
 * Service-related types for app-migrator
 */

import type { CdsUi5PluginInfo } from '@sap-ux/project-access';
import type { Annotations } from '@sap-ux/axios-extension';
import type { ODataVersion, DatasourceType, CapType, ApiHubType, SapSystemSourceType } from './constants.js';

/**
 * Backend configuration
 */
export type Backend = {
    source?: string;
    target?: string;
    type?: string;
    destination?: string;
};

/**
 * Neo-app destination configuration
 */
export type NeoappDestination = {
    path: string;
    name: string;
    entryPath?: string;
};

/**
 * Backend configuration details
 */
export interface BackendConfig {
    path: string;
    url?: string;
    client?: string;
    destination?: string;
    destinationInstance?: string;
    pathPrefix?: string;
}

/**
 * Entity configuration for OData
 * NOTE: Consolidation with app-gen-core tracked in #38120
 */
export interface EntityConfig {
    mainEntity?: { entityName: string; type?: any };
    filterEntityType?: string;
    navigationEntity?: {
        EntitySet: string;
        Name: string;
        Role?: string;
    };
}

/**
 * API Hub configuration
 * Defines the api hub service properties for enterprise and non-enterprise versions
 */
export interface ApiHubConfig {
    apiHubKey: string;
    apiHubType: ApiHubType;
}

/**
 * CAP service configuration
 */
export interface CapService {
    projectPath: string; // The CAP Project Root
    serviceName: string;
    appPath?: string; // Optional custom CAP app folder
    serviceCdsPath?: string; // relative path to cap service cds file
    capType?: CapType; // CAP implementation type
    capCdsInfo?: CdsUi5PluginInfo; // Has min @sap/cds version, NPM Workspaces and cds plugin configured
}

/**
 * Service configuration
 */
export interface Service {
    host: string;
    client?: string;
    scp?: boolean;
    destination?: string;
    destinationInstance?: string;
    servicePath?: string; // url path of odata or cap service
    edmx: string;
    annotations?: Annotations[];
    version?: ODataVersion; // Not present for FF no datasource template flow
    capService?: CapService;
    source: DatasourceType;
    sapSystemSource?: SapSystemSourceType; // Only used by README
    localEdmxFilePath?: string; // Only used by README
    destinationAuthType?: string;
    apiHubConfig?: ApiHubConfig;
    ignoreCertError?: boolean;
}

/**
 * User credentials
 */
export interface Credentials {
    username: string;
    password?: string;
}
