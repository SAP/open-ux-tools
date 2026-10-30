export const YUI_EXTENSION_ID = 'sapos.yeoman-ui';
// From YUI version 1.16.6 the message 'The files have been generated.' is not shown unless a top level dir is created
export const YUI_MIN_VER_FILES_GENERATED_MSG = '1.16.6';
export const SCRIPT_FLP_SANDBOX = '/test/flpSandbox.html';

/**
 * API Hub types for SAP Business Accelerator Hub services
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
    S4HC: 'S4HC',
    ABAP_CLOUD: 'ABAP_CLOUD'
} as const;
export type SapSystemSourceType = (typeof SapSystemSourceType)[keyof typeof SapSystemSourceType];
