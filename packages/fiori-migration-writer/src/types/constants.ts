/**
 * Constants and enums used throughout the app-migrator
 */

/**
 * OData versions supported by the catalog service
 */
export enum ODataVersion {
    v2 = '2',
    v4 = '4'
}

/**
 * Common data source types
 */
export const enum DatasourceType {
    FILE = 'File',
    URL = 'OData Url',
    CAP = 'Local Cap',
    SAP_SYSTEM = 'SAP System',
    API_HUB = 'SAP Business Accelerator Hub',
    MTA_FILE = 'MTA File',
    NONE = 'None'
}

/**
 * SAP UX layer types
 */
export enum SapUxLayer {
    VENDOR = 'VENDOR',
    CUSTOMER_BASE = 'CUSTOMER_BASE'
}

/**
 * CAP project types
 */
export enum CapType {
    NODE_JS = 'Node.js',
    JAVA = 'Java'
}

/**
 * API Hub types
 */
export const enum ApiHubType {
    apiHub = 'API_HUB',
    apiHubEnterprise = 'API_HUB_ENTERPRISE'
}

/**
 * SAP system source types
 */
export const enum SapSystemSourceType {
    SCP = 'SCP',
    ON_PREM = 'ON_PREM',
    S4HC = 'S4HC'
}

/**
 * Neo-app.json route target types
 */
export enum neoAppJsonRouteTargetTypes {
    application = 'application',
    destination = 'destination'
}

/**
 * Template data keys
 */
export enum TemplateDataKey {
    project = 'project',
    service = 'service',
    ui5Yaml = 'ui5Yaml',
    packageJson = 'packageJson'
}

/**
 * SAP WebIDE common setting constant
 */
export const sapWattCommonSetting = 'sap.watt.common.setting';
