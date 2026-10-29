// sap/fe/macros/table/TableAPI was removed from @sapui5/types in v1.121+.
// Provide a minimal ambient declaration so the type-check build does not break.
declare module 'sap/fe/macros/table/TableAPI' {
    import ManagedObject from 'sap/ui/base/ManagedObject';
    export default class TableAPI extends ManagedObject {}
}
