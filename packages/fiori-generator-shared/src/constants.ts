export const YUI_EXTENSION_ID = 'sapos.yeoman-ui';
// From YUI version 1.16.6 the message 'The files have been generated.' is not shown unless a top level dir is created
export const YUI_MIN_VER_FILES_GENERATED_MSG = '1.16.6';
export const SCRIPT_FLP_SANDBOX = '/test/flpSandbox.html';

// Constants for the FPM page building block feature. Defined here rather than in @sap-ux/fe-fpm-writer
// because odata-service-inquirer needs them at runtime but cannot take fe-fpm-writer as a runtime dep
// due to a CJS/ESM crash via fiori-annotation-api. @sap-ux/fe-fpm-writer re-exports these for backwards compatibility.
export const PAGE_TEMPLATE_TYPE_FULL = 'full';
export const PAGE_TEMPLATE_TYPE_BASIC = 'basic';
export type PageTemplateType = typeof PAGE_TEMPLATE_TYPE_FULL | typeof PAGE_TEMPLATE_TYPE_BASIC;
export const MIN_UI5_VERSION_PAGE_BUILDING_BLOCK = '1.136.0';
export const MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT = '1.145.0';
