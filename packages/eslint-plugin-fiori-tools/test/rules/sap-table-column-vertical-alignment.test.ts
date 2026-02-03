import rule from '../../src/rules/sap-table-column-vertical-alignment';
import { RuleTester } from 'eslint';
import { meta, languages } from '../../src/index';
import { getManifestAsCode, setup, V2_MANIFEST, V2_MANIFEST_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-table-column-vertical-alignment';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, rule, {
    valid: [
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Middle", Responsive table exists on AnalyticalListPage',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableColumnVerticalAlignment'],
                        value: 'Middle'
                    },
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'tableSettings',
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Middle", Responsive table exists on ObjectPage',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableColumnVerticalAlignment'],
                        value: 'Middle'
                    },
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'pages',
                            'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'sections',
                            'Products',
                            'tableSettings',
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Top", no Responsive tables exist',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableColumnVerticalAlignment'],
                        value: 'Top'
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is undefined, Responsive table exists on ObjectPage',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'pages',
                            'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'sections',
                            'Products',
                            'tableSettings',
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is undefined, no Responsive tables exist',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [])
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Top", Responsive table exists on AnalyticalListPage',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableColumnVerticalAlignment'],
                        value: 'Top'
                    },
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'tableSettings',
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    }
                ]),
                output: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'tableSettings',
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-table-column-vertical-alignment',
                        line: 126,
                        column: 7
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Bottom", Responsive table exists on ObjectPage',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableColumnVerticalAlignment'],
                        value: 'Bottom'
                    },
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'pages',
                            'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'sections',
                            'Products',
                            'tableSettings',
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    }
                ]),
                output: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'pages',
                            'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'sections',
                            'Products',
                            'tableSettings',
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-table-column-vertical-alignment',
                        line: 126,
                        column: 7
                    }
                ]
            },
            []
        )
    ]
});
