declare module 'sap/fe/core/AppComponent' {
    import UIComponent from 'sap/ui/core/UIComponent';
    interface AppComponent extends UIComponent {}

    export default AppComponent;
}

declare module 'sap/fe/core/TemplateComponent' {
    import UIComponent from 'sap/ui/core/UIComponent';
    import type AppComponent from 'sap/fe/core/AppComponent';
    interface TemplateComponent extends UIComponent {
        getAppComponent(): AppComponent;
        getEntitySet: () => string;
        getContextPath: () => string;
    }

    export default TemplateComponent;
}

declare module 'sap/fe/core/sap/VariantManagement' {
    type VariantManagement = 'Control' | 'None' | 'Page';

    export default VariantManagement;
}
