// Common base libraries for V2 Smart Template applications
const V2_SMART_TEMPLATE_BASE_LIBS =
    'sap.m, sap.ushell, sap.ui.core, sap.f, sap.ui.comp, sap.ui.table, sap.suite.ui.generic.template, sap.ui.generic.app';

// SAP UI5 libraries by floor plan type
export const SapUiLibs: Record<string, string> = {
    V2_LIST_REPORT: V2_SMART_TEMPLATE_BASE_LIBS,
    V2_ANALYTICAL: V2_SMART_TEMPLATE_BASE_LIBS,
    V4_LIST_REPORT: 'sap.m, sap.ushell, sap.fe.templates',
    V2_OVERVIEW:
        'sap.m, sap.f, sap.ushell, sap.ui.core, sap.ui.layout, sap.ui.generic.app, sap.ui.comp, sap.suite.ui.generic.template, sap.ovp, sap.ui.rta',
    V2_WORKLIST: `${V2_SMART_TEMPLATE_BASE_LIBS}, sap.collaboration`,
    generic: 'sap.m, sap.ushell, sap.collaboration, sap.ui.layout',
    SAPApp: 'sap.f, sap.m, sap.ui.comp, sap.ui.core, sap.ui.generic.app, sap.ui.table, sap.ushell'
};
