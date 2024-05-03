import { ReuseLibConfig } from '../../src/types';

export const reuseLibs: ReuseLibConfig[] = [
    {
        name: `my.namespace.reuse.attachmentservice`,
        path: 'sample/libs/my.namespace.reuse.attachmentservice',
        type: 'library',
        uri: '/sap/ui5/sap/attach/'
    },
    {
        name: `my.namespace.comp`,
        path: 'sample/comp/my.namespace.reuse',
        type: 'component',
        uri: '/sap/ui5_ui5/sap/comp_1/'
    }
];
