// sap/fe/macros/table/TableAPI was removed from @sapui5/types in v1.121+.
// Provide a minimal ambient declaration so the type-check build does not break.
// Extends Control (not ManagedObject) so MacroTable is assignable to UI5Element without unsafe casts.
declare module 'sap/fe/macros/table/TableAPI' {
    import Control from 'sap/ui/core/Control';
    export default class TableAPI extends Control {}
}
