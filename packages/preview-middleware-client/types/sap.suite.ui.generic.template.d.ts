declare module 'sap/suite/ui/generic/template/lib/AppComponent' {
    import UIComponent from 'sap/ui/core/UIComponent';
    interface AppComponent extends UIComponent {}

    export default AppComponent;
}

declare module 'sap/suite/ui/generic/template/lib/TemplateComponent' {
    import UIComponent from 'sap/ui/core/UIComponent';
    import AppComponent from 'sap/suite/ui/generic/template/lib/AppComponent';
    
    export interface TemplateComponent extends UIComponent {
        getEntitySet: () => string;
        getAppComponent(): AppComponent;
    }

    export default TemplateComponent;
}

declare module 'sap/suite/ui/generic/template/ListReport' {
    import TemplateComponent from 'sap/suite/ui/generic/template/lib/TemplateComponent';

    export interface ListReportComponent extends TemplateComponent {
        getSmartVariantManagement: () => boolean;
        getVariantManagement: () => string;
    }

    export default ListReportComponent;
}
