import { RuleTester } from 'eslint';
import noInlineDeleteWithMultiselectRule from '../../src/rules/sap-no-inline-delete-with-multiselect.js';
import { meta, languages } from '../../src/index.js';
import { getManifestAsCode, setup, V2_MANIFEST, V2_MANIFEST_PATH } from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-no-inline-delete-with-multiselect';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// Path to the AnalyticalListPage tableSettings in the V2 manifest
const ALP_SETTINGS_PATH = [
    'sap.ui.generic.app',
    'pages',
    'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
    'component',
    'settings',
    'tableSettings'
];

// Path to the ObjectPage component settings in the V2 manifest
const OP_BASE_PATH = [
    'sap.ui.generic.app',
    'pages',
    'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
    'pages',
    'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
    'component',
    'settings'
];

const OP_TABLE_SETTINGS_PATH = [...OP_BASE_PATH, 'tableSettings'];
const OP_SECTION_TABLE_SETTINGS_PATH = [...OP_BASE_PATH, 'sections', 'SalesOrderItems', 'tableSettings'];

ruleTester.run(TEST_NAME, noInlineDeleteWithMultiselectRule, {
    valid: [
        createValidTest(
            {
                name: 'V2 - neither inlineDelete nor multiSelect set - no issue',
                filename: V2_MANIFEST_PATH,
                code: JSON.stringify(V2_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - only inlineDelete enabled - no issue',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    { path: [...ALP_SETTINGS_PATH, 'inlineDelete'], value: true },
                    { path: [...ALP_SETTINGS_PATH, 'multiSelect'], value: false }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - only multiSelect enabled - no issue',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    { path: [...ALP_SETTINGS_PATH, 'inlineDelete'], value: false },
                    { path: [...ALP_SETTINGS_PATH, 'multiSelect'], value: true }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - multiSelect true, inlineDelete not set - no issue',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [{ path: [...ALP_SETTINGS_PATH, 'multiSelect'], value: true }])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 object page - only inlineDelete enabled at page-level tableSettings - no issue',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    { path: [...OP_TABLE_SETTINGS_PATH, 'inlineDelete'], value: true },
                    { path: [...OP_TABLE_SETTINGS_PATH, 'multiSelect'], value: false }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 object page - only inlineDelete enabled at section-level tableSettings - no issue',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    { path: [...OP_SECTION_TABLE_SETTINGS_PATH, 'inlineDelete'], value: true }
                ])
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V2 - both inlineDelete and multiSelect enabled on list report page',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    { path: [...ALP_SETTINGS_PATH, 'inlineDelete'], value: true },
                    { path: [...ALP_SETTINGS_PATH, 'multiSelect'], value: true }
                ]),
                errors: [
                    {
                        message: '"inlineDelete" and "multiSelect" cannot both be enabled in the same table settings.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2 object page - both inlineDelete and multiSelect enabled at page-level tableSettings',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    { path: [...OP_TABLE_SETTINGS_PATH, 'inlineDelete'], value: true },
                    { path: [...OP_TABLE_SETTINGS_PATH, 'multiSelect'], value: true }
                ]),
                errors: [
                    {
                        message: '"inlineDelete" and "multiSelect" cannot both be enabled in the same table settings.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2 object page - both inlineDelete and multiSelect enabled at section-level tableSettings',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    { path: [...OP_SECTION_TABLE_SETTINGS_PATH, 'inlineDelete'], value: true },
                    { path: [...OP_SECTION_TABLE_SETTINGS_PATH, 'multiSelect'], value: true }
                ]),
                errors: [
                    {
                        message: '"inlineDelete" and "multiSelect" cannot both be enabled in the same table settings.'
                    }
                ]
            },
            []
        )
    ]
});
