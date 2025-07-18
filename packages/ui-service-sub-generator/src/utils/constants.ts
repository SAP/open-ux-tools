export const STEP_SAP_SYSTEM_CONFIG = 'SAP_SYSTEM_CONFIG';
export const STEP_SERVICE_CONFIG = 'SERVICE_CONFIG';
export const prompts = [
    {
        key: STEP_SAP_SYSTEM_CONFIG,
        name: 'SAP System selection',
        description: '',
        order: 0
    },
    { key: STEP_SERVICE_CONFIG, name: 'UI Service Configuration', description: '', order: 1 }
];

export const boUri = '/sap/bc/adt/bo/behaviordefinitions/';
export const cdsUri = '/sap/bc/adt/ddic/ddl/sources/';
export const UI_SERVICE_CACHE = '$ui-service-cache';
export const SERVICE_GENERATION_SUCCESS = 'SERVICE_GENERATION_SUCCESS';
export const SERVICE_GENERATION_FAIL = 'SERVICE_GENERATION_FAIL';
export const SAP_NAMESPACE = 'sap';
