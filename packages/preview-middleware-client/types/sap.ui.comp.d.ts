import SmartTableOriginal from 'sap/ui/comp/smarttable/SmartTable';
declare module 'sap/ui/comp/smarttable/SmartTable' {
    export interface SmartTable extends SmartTableOriginal {
        /**
         * @ui5-restricted sap.ui.rta
         * @returns
         */
        getVariantManagement: () => string;
    }

    export default SmartTable;
}
