declare module 'sap/suite/ui/generic/template/lib/TemplateComponent' {
    import UIComponent from 'sap/ui/core/UIComponent';

    export interface TemplateComponent extends UIComponent {
        getEntitySet: () => string;
    }

    export default TemplateComponent;
}

declare module 'sap/suite/ui/generic/template/ListReport' {
    import TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';

    export interface ListReportComponent extends TemplateComponent {
        getSmartVariantManagement: () => boolean;
        getVariantManagement: ()=> string;
    }

    export default ListReportComponent;
}
