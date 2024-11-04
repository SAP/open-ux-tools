import { ReuseLibType } from '@sap-ux/project-access';

export const reuseLibs = [
    {
        name: `se.mi.plm.attachmentservice - library - UI Library for Fiori Reuse Attachment Service`,
        value: {
            name: `se.mi.plm.attachmentservice`,
            path: 'sample/libs/se.mi.plm.attachmentservice',
            type: ReuseLibType.Library,
            uri: '/sap/bc/ui5_ui5/sap/plm_ath_cres1/',
            dependencies: ['sap.s4h.cfnd.featuretoggle'],
            libRoot: 'sample/libs/se.mi.plm.attachmentservice/src/sap/se/mi/plm/lib/attachmentservice'
        }
    },
    {
        name: `se.mi.plm.attachmentservice - library - UI Library for Fiori Reuse Attachment Service`,
        value: {
            name: `se.mi.plm.attachmentservice`,
            path: 'sample/libs/se.mi.plm.attachmentservice',
            type: ReuseLibType.Library,
            uri: '/sap/bc/ui5_ui5/sap/plm_ath_cres1/',
            dependencies: [],
            libRoot: 'sample/libs/se.mi.plm.attachmentservice/src/sap/se/mi/plm/lib/attachmentservice'
        }
    }
];
