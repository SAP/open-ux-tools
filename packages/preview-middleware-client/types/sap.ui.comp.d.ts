declare module 'sap/ui/comp/smarttable' {
    import SmartTable from 'sap/ui/comp/smarttable/SmartTable';
    export interface SmartTableExtended extends SmartTable {
        getVariantManagement: () => string;
        getEntitySet: () => string;
    }

    export default SmartTableExtended;
}
