// Project types - sync with app-gen PROJECT_TYPE
export const PROJECT_TYPE = {
    WorklistV2: 'V2_WORKLIST',
    ListReportObjectPageV2: 'V2_LIST_REPORT',
    AnalyticalListPageV2: 'V2_ANALYTICAL',
    ListReportObjectPageV4: 'V4_LIST_REPORT',
    OverviewPageV2: 'V2_OVERVIEW',
    ListReportObjectPage: 'LIST_REPORT_OBJECT_PAGE',
    AnalyticalListPage: 'ANALYTICAL_LIST_PAGE'
};

// SAP UI5 libraries by floor plan type
export const SapUiLibs: Record<string, string> = {
    V2_LIST_REPORT:
        'sap.m, sap.ushell, sap.ui.core, sap.f, sap.ui.comp, sap.ui.table, sap.suite.ui.generic.template, sap.ui.generic.app',
    V2_ANALYTICAL:
        'sap.m, sap.ushell, sap.ui.core, sap.f, sap.ui.comp, sap.ui.table, sap.suite.ui.generic.template, sap.ui.generic.app',
    V4_LIST_REPORT: 'sap.m, sap.ushell, sap.fe.templates',
    V2_OVERVIEW:
        'sap.m, sap.f, sap.ushell, sap.ui.core, sap.ui.layout, sap.ui.generic.app, sap.ui.comp, sap.suite.ui.generic.template, sap.ovp, sap.ui.rta',
    V2_WORKLIST:
        'sap.m, sap.ushell, sap.ui.core, sap.f, sap.ui.comp, sap.ui.table, sap.suite.ui.generic.template, sap.ui.generic.app, sap.collaboration',
    generic: 'sap.m, sap.ushell, sap.collaboration, sap.ui.layout',
    SAPApp: 'sap.f, sap.m, sap.ui.comp, sap.ui.core, sap.ui.generic.app, sap.ui.table, sap.ushell'
};
