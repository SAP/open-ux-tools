declare module 'sap/suite/ui/generic/template/lib/TemplateComponent' {
    import UIComponent from 'sap/ui/core/UIComponent';

    export interface TemplateComponent extends UIComponent {
        getEntitySet: () => string;
    }

    export default TemplateComponent;
}

declare module 'sap/suite/ui/generic/template/ListReport/Component' {
    import TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';

    interface ListReportComponent extends TemplateComponent {
        getSmartVariantManagement: () => boolean;
    }

    export default ListReportComponent;
}

declare module 'sap/suite/ui/generic/template/AnalyticalListPage/Component' {
    import TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';

    interface AnalyticalListComponent extends TemplateComponent {
        getSmartVariantManagement: () => boolean;
    }

    export default AnalyticalListComponent;
}

declare module 'sap/suite/ui/generic/template/AnalyticalListPage/control/SmartFilterBarExt' {
    import SmartFilterBar from 'sap/ui/comp/smartfilterbar/SmartFilterBar';
    interface SmartFilterBarExt extends SmartFilterBar {}

    export default SmartFilterBarExt;
}
