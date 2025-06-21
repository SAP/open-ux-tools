declare module 'sap/fe/templates/ListComponent' {
    import type TemplateComponent from 'sap/fe/core/TemplateComponent';
    import type VariantManagement from 'sap/fe/core/sap/VariantManagement';
    interface ListComponent extends TemplateComponent {
        getVariantManagement(): VariantManagement;
    }

    export default ListComponent;
}

declare module 'sap/fe/templates/ListReport/Component' {
    import type ListComponent from 'sap/fe/templates/ListComponent';
    interface ListReportComponent extends ListComponent {}

    export default ListReportComponent;
}

declare module 'sap/fe/templates/AnalyticalListPage/Component' {
    import type ListComponent from 'sap/fe/templates/ListComponent';
    interface AnalyticalListPageComponent extends ListComponent {}

    export default AnalyticalListPageComponent;
}

declare module 'sap/fe/templates/ObjectPage/Component' {
    import type TemplateComponent from 'sap/fe/core/TemplateComponent';
    import type VariantManagement from 'sap/fe/core/sap/VariantManagement';
    interface ObjectPageComponent extends TemplateComponent {
        getVariantManagement(): VariantManagement;
    }

    export default ObjectPageComponent;
}
