declare module 'sap/suite/ui/generic/template/ListReport' {
    import ManagedObject from 'sap/ui/base/ManagedObject';
    export interface ListReportComponent extends ManagedObject {
        getSmartVariantManagement: () => boolean;
        getEntitySet: () => string;
        getMetadata: () => ComponentMetadata;
        getVariantManagement: () => string;
    }

    export default ListReportComponent;
}
