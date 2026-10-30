// Common base libraries for V2 Smart Template applications
const V2_SMART_TEMPLATE_BASE_LIBS =
    'sap.m, sap.ushell, sap.ui.core, sap.f, sap.ui.comp, sap.ui.table, sap.suite.ui.generic.template, sap.ui.generic.app';

// SAP UI5 libraries by floor plan type
// Keys match TemplateType values from @sap-ux/fiori-elements-writer
export const SapUiLibs: Record<string, string> = {
    lrop: V2_SMART_TEMPLATE_BASE_LIBS, // ListReportObjectPage (V2/V4)
    alp: V2_SMART_TEMPLATE_BASE_LIBS, // AnalyticalListPage (V2)
    ovp: 'sap.m, sap.f, sap.ushell, sap.ui.core, sap.ui.layout, sap.ui.generic.app, sap.ui.comp, sap.suite.ui.generic.template, sap.ovp, sap.ui.rta', // OverviewPage (V2)
    worklist: `${V2_SMART_TEMPLATE_BASE_LIBS}, sap.collaboration`, // Worklist (V2/V4)
    generic: 'sap.m, sap.ushell, sap.collaboration, sap.ui.layout',
    SAPApp: 'sap.f, sap.m, sap.ui.comp, sap.ui.core, sap.ui.generic.app, sap.ui.table, sap.ushell'
};
