import path from 'path';
import { ReuseLibType } from '@sap-ux/project-access';

export const workspaceFolders = [
    {
        name: 'libs',
        uri: {
            authority: '',
            fragment: '',
            fsPath: path.join(__dirname, '..', 'sample/libs/se.mi.plm.attachmentservice'),
            path: '',
            query: '',
            scheme: 'file',
            with: jest.fn(),
            toJSON: jest.fn()
        },
        index: 1
    },
    {
        name: 'project1',
        uri: {
            authority: '',
            fragment: '',
            fsPath: path.join(__dirname, '..', 'sample/test_project_lrop_v2'),
            path: '',
            query: '',
            scheme: 'file',
            with: jest.fn(),
            toJSON: jest.fn()
        },
        index: 1
    },
    {
        name: 'project2',
        uri: {
            authority: '',
            fragment: '',
            fsPath: path.join(__dirname, '..', 'sample/test_project_lrop_not_sapux'),
            path: '',
            query: '',
            scheme: 'file',
            with: jest.fn(),
            toJSON: jest.fn()
        },
        index: 1
    }
];

export const workspaceFoldersMissingData = [
    {
        name: 'libs',
        uri: {
            authority: '',
            fragment: '',
            fsPath: path.join(__dirname, '..', 'sample/libs/se.mi.plm.attachmentservice_missing_data'),
            path: '',
            query: '',
            scheme: 'file',
            with: jest.fn(),
            toJSON: jest.fn()
        },
        index: 1
    }
];

export const workspaceFoldersNoUri = [
    {
        name: 'libs',
        uri: {
            authority: '',
            fragment: '',
            fsPath: path.join(__dirname, '..', 'sample/libs/se.mi.plm.attachmentservice_no_uri'),
            path: '',
            query: '',
            scheme: 'file',
            with: jest.fn(),
            toJSON: jest.fn()
        },
        index: 1
    }
];

export const workspaceFoldersNoUriAndNoManifest = [
    {
        name: 'libs',
        uri: {
            authority: '',
            fragment: '',
            fsPath: path.join(__dirname, '..', 'sample/libs/se.mi.plm.attachmentservice_no_uri_and_no_manifest_json'),
            path: '',
            query: '',
            scheme: 'file',
            with: jest.fn(),
            toJSON: jest.fn()
        },
        index: 1
    }
];

export const workspaceFoldersNoManifest = [
    {
        name: 'libnomanifest',
        uri: {
            authority: '',
            fragment: '',
            fsPath: path.join(__dirname, '..', 'sample/libs/se.mi.plm.attachmentservice_no_manifest_json'),
            path: '',
            query: '',
            scheme: 'file',
            with: jest.fn(),
            toJSON: jest.fn()
        },
        index: 1
    }
];

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

export const reuseLibsNoUri = [
    {
        name: `se.mi.plm.attachmentservice - library - UI Library for Fiori Reuse Attachment Service`,
        value: {
            name: `se.mi.plm.attachmentservice`,
            path: 'sample/libs/se.mi.plm.attachmentservice_no_uri',
            type: ReuseLibType.Library,
            uri: '',
            dependencies: ['sap.s4h.cfnd.featuretoggle'],
            libRoot: 'sample/libs/se.mi.plm.attachmentservice_no_uri/src/sap/se/mi/plm/lib/attachmentservice'
        }
    }
];
