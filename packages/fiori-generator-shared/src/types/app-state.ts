import type { Annotations, ODataVersion } from '@sap-ux/axios-extension';

export const ApiHubType = {
    apiHub: 'API_HUB',
    apiHubEnterprise: 'API_HUB_ENTERPRISE'
} as const;
export type ApiHubType = (typeof ApiHubType)[keyof typeof ApiHubType];

/**
 * Defines the api hub service properties or enterprise and non-enterprise versions
 */
export interface ApiHubConfig {
    apiHubKey: string;
    apiHubType: ApiHubType;
}

/**
 * The project properties common to all generators and migrators. Consumers extend this with their own properties.
 */
export interface BaseProject {
    targetFolder: string;
    addDeployConfig?: boolean;
    addFlpConfig?: boolean;
    name: string;
    namespace?: string;
    title: string;
    description: string;
    ui5Theme: string;
    ui5Version: string;
    ui5FrameworkUrl?: string; // URL providing ui5 libraries, set to default if not provided
    localUI5Version: string;
    sapux?: boolean;
    skipAnnotations?: boolean;
    enableEslint?: boolean;
    enableTypeScript?: boolean;
    formEntry?: boolean;
    flpAppId?: string; // Represents the concatentation of sematicObject and action to form a navigation intent as used in url http://some/path#<semanticObject>-<action>
    minSupportedUI5Version?: string; // min supported version based on floorplan and odata version
    manifestMinUI5Version?: string; // ui5 version for manifest.json minUI5Version,
}

/**
 * The service properties common to all generators and migrators. Consumers extend this with their own properties.
 */
export interface BaseService {
    host?: string;
    client?: string;
    servicePath?: string; // url path of odata or cap service
    edmx?: string;
    annotations?: Annotations[];
    version?: `${ODataVersion}`;
    source: string;
    localEdmxFilePath?: string;
    destinationAuthType?: string;
    apiHubConfig?: ApiHubConfig;
    ignoreCertError?: boolean;
}
