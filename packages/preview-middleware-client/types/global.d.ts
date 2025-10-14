export interface Window {
    'sap-ui-config': {
        [key: string]: (fnCallback: () => void) => void | Promise<void>;
    };
    'sap-ushell-config': {
        [key: string]: unknown;
    };
    [key: string]: string;
}

/**
 * Core
 */
declare global {
    import type Element from 'sap/ui/core/Element';
    import type View from 'sap/ui/core/mvc/View';
    import type XMLView from 'sap/ui/core/mvc/XMLView';
    import type Component from 'sap/ui/core/Component';
    import type ManagedObject from 'sap/ui/base/ManagedObject';

    interface TypeMap {
        'sap.ui.core.Element': Element;
        'sap.ui.core.mvc.View': View;
        'sap.ui.core.mvc.XMLView': XMLView;
        'sap.ui.core.Component': Component;
        'sap.ui.base.ManagedObject': ManagedObject;
    }
}

/**
 * ui controls
 */
declare global {
    import type MdcTable from 'sap/ui/mdc/Table';
    import type GridTable from 'sap/ui/table/Table';
    import type TreeTable from 'sap/ui/table/TreeTable';
    import type AnalyticalTable from 'sap/ui/table/AnalyticalTable';
    interface TypeMap {
        'sap.ui.mdc.Table': MdcTable;
        'sap.ui.table.TreeTable': TreeTable;
        'sap.ui.table.AnalyticalTable': AnalyticalTable;
        'sap.ui.table.Table': GridTable;
    }
}

/**
 * m controls
 */
declare global {
    import type Input from 'sap/m/Input';
    import type IconTabBar from 'sap/m/IconTabBar';
    import type Table from 'sap/m/Table';
    import type FlexBox from 'sap/m/FlexBox';
    import type IconTabFilter from 'sap/m/IconTabFilter';
    import type OverflowToolbar from 'sap/m/OverflowToolbar';
    interface TypeMap {
        'sap.m.Input': Input;
        'sap.m.OverflowToolbar': OverflowToolbar;
        'sap.m.IconTabBar': IconTabBar;
        'sap.m.IconTabFilter': IconTabFilter;
        'sap.m.Table': Table;

        'sap.m.FlexBox': FlexBox;
    }
}

/**
 * Suite Controls
 */
declare global {
    import type SmartFilterBar from 'sap/ui/comp/smartfilterbar/SmartFilterBar';
    import type SmartTableExtended from 'sap/ui/comp/smarttable';
    interface TypeMap {
        'sap.ui.comp.smarttable.SmartTable': SmartTableExtended;
        'sap.ui.comp.smartfilterbar.SmartFilterBar': SmartFilterBar;
    }
}

/**
 * uxap
 */
declare global {
    import type ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
    import type ObjectPageSubSection from 'sap/uxap/ObjectPageSubSection';
    import type ObjectPageSection from 'sap/uxap/ObjectPageSection';

    interface TypeMap {
        'sap.uxap.ObjectPageLayout': ObjectPageLayout;
        'sap.uxap.ObjectPageSubSection': ObjectPageSubSection;
        'sap.uxap.ObjectPageSection': ObjectPageSection;
    }
}

/**
 * FE V2
 */
declare global {
    import type SmartTableExtended from 'sap/ui/comp/smarttable';
    import type TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';
    import type ListReportComponent from 'sap/suite/ui/generic/template/ListReport';
    interface TypeMap {
        'sap.suite.ui.generic.template.lib.TemplateComponent': TemplateComponent;
        'sap.suite.ui.generic.template.ListReport.Component': ListReportComponent;
        'sap.suite.ui.generic.template.AnalyticalListPage.control.SmartFilterBarExt': SmartTableExtended; // Does not have exported types
    }
}

/**
 * FE V4
 */
declare global {
    import type TemplateComponent from 'sap/fe/core/TemplateComponent';
    import type ListReportComponent from 'sap/fe/templates/ListReport/Component';
    import type ObjectPageComponent from 'sap/fe/templates/ObjectPage/Component';
    interface TypeMap {
        'sap.fe.core.TemplateComponent': TemplateComponent;

        'sap.fe.templates.ListReport.Component': ListReportComponent;
        'sap.fe.templates.ObjectPage.Component': ObjectPageComponent;
    }
}
