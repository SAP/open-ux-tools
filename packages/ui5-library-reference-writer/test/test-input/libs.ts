import { ReuseLibConfig } from '../../src/types';

export const reuseLibs: ReuseLibConfig[] = [
    {
        name: `se.mi.plm.attachmentservice`,
        path: 'sample/libs/se.mi.plm.attachmentservice',
        type: 'library',
        uri: '/sap/bc/ui5_ui5/sap/plm_ath_cres1/'
    },
    {
        name: `se.mi.plm.comp`,
        path: 'sample/comp/se.mi.plm.comp',
        type: 'component',
        uri: '/sap/bc/ui5_ui5/sap/comp_1/'
    }
];
