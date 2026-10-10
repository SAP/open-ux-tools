/**
 * Constants and enums used throughout the app-migrator
 */

/**
 * OData versions supported by the catalog service
 */
export const ODataVersion = {
    v2: '2',
    v4: '4'
} as const;
export type ODataVersion = (typeof ODataVersion)[keyof typeof ODataVersion];

/**
 * Common data source types
 */
export const DatasourceType = {
    FILE: 'File',
    URL: 'OData Url',
    CAP: 'Local Cap',
    SAP_SYSTEM: 'SAP System',
    API_HUB: 'SAP Business Accelerator Hub',
    MTA_FILE: 'MTA File',
    NONE: 'None'
} as const;
export type DatasourceType = (typeof DatasourceType)[keyof typeof DatasourceType];

/**
 * SAP UX layer types
 */
export const SapUxLayer = {
    VENDOR: 'VENDOR',
    CUSTOMER_BASE: 'CUSTOMER_BASE'
} as const;
export type SapUxLayer = (typeof SapUxLayer)[keyof typeof SapUxLayer];

/**
 * CAP project types
 */
export const CapType = {
    NODE_JS: 'Node.js',
    JAVA: 'Java'
} as const;
export type CapType = (typeof CapType)[keyof typeof CapType];

/**
 * API Hub types
 */
export const ApiHubType = {
    apiHub: 'API_HUB',
    apiHubEnterprise: 'API_HUB_ENTERPRISE'
} as const;
export type ApiHubType = (typeof ApiHubType)[keyof typeof ApiHubType];

/**
 * SAP system source types
 */
export const SapSystemSourceType = {
    SCP: 'SCP',
    ON_PREM: 'ON_PREM',
    S4HC: 'S4HC'
} as const;
export type SapSystemSourceType = (typeof SapSystemSourceType)[keyof typeof SapSystemSourceType];

/**
 * Neo-app.json route target types
 */
export const neoAppJsonRouteTargetTypes = {
    application: 'application',
    destination: 'destination'
} as const;
export type neoAppJsonRouteTargetTypes = (typeof neoAppJsonRouteTargetTypes)[keyof typeof neoAppJsonRouteTargetTypes];

/**
 * Template data keys
 */
export const TemplateDataKey = {
    project: 'project',
    service: 'service',
    ui5Yaml: 'ui5Yaml',
    packageJson: 'packageJson'
} as const;
export type TemplateDataKey = (typeof TemplateDataKey)[keyof typeof TemplateDataKey];

/**
 * SAP WebIDE common setting constant
 */
export const sapWattCommonSetting = 'sap.watt.common.setting';
