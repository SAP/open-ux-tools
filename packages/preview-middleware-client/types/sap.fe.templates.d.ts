declare module 'sap/fe/templates/ObjectPage/Component' {
    import UIComponent from 'sap/ui/core/UIComponent';
    interface FEObjectPageComponent extends UIComponent {
        getEntitySet: () => string;
        getContextPath: () => string;
    }

    export default FEObjectPageComponent;
}

declare module 'sap/fe/templates/ListReport/Component' {
    import UIComponent from 'sap/ui/core/UIComponent';
    interface FEListReportComponent extends UIComponent {
        getEntitySet: () => string;
        getContextPath: () => string;
    }

    export default FEListReportComponent;
}
