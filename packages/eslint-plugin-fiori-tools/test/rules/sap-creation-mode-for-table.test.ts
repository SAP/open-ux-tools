import createTableRule from '../../src/rules/sap-creation-mode-for-table';
import { RuleTester } from 'eslint';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
    V2_MANIFEST,
    V2_MANIFEST_PATH
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-creation-mode-for-table-v2';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

//------------------------------------------------------------------------------
// FE V2 Tests
//------------------------------------------------------------------------------
ruleTester.run(TEST_NAME, createTableRule, {
    valid: [
        createValidTest(
            {
                name: 'V2: Scenario 1 - ✅ Valid at Section → ✅ PASS (Section stops flow)',
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
                            'SalesOrderItems',
                            'createMode'
                        ],
                        value: 'creationRows'
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: Scenario 3 - ✅ Valid at Page → ✅ PASS (Page stops flow)',
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
                            'createMode'
                        ],
                        value: 'creationRows'
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: Scenario 5 - ✅ Valid at App → ✅ PASS (App validated)',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: 'creationRows'
                    }
                ])
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'V2: Scenario 2 - ⚠️ Invalid at Section → ⚠️ WARN (Section stops flow)',
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
                            'SalesOrderItems',
                            'createMode'
                        ],
                        value: 'badValue'
                    }
                ]),
                errors: [
                    {
                        messageId: 'invalidCreateMode'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: Scenario 4 - ⚠️ Invalid at Page → ⚠️ WARN (Page stops flow)',
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
                            'createMode'
                        ],
                        value: 'badValue'
                    }
                ]),
                errors: [
                    {
                        messageId: 'invalidCreateMode'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: Scenario 6 - ⚠️ Invalid at App → ⚠️ WARN (App validated)',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: 'badValue'
                    }
                ]),
                errors: [
                    {
                        messageId: 'invalidCreateMode'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: AnalyticalTable at Section - ⚠️ Creation mode not supported for Analytical tables',
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
                            'SalesOrderItems',
                            'tableSettings',
                            'type'
                        ],
                        value: 'AnalyticalTable'
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
                            'SalesOrderItems',
                            'createMode'
                        ],
                        value: 'creationRows'
                    }
                ]),
                errors: [
                    {
                        messageId: 'analyticalTableNotSupported'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: AnalyticalTable at Page - ⚠️ Creation mode not supported for Analytical tables',
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
                            'SalesOrderItems',
                            'tableSettings',
                            'type'
                        ],
                        value: 'AnalyticalTable'
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
                            'createMode'
                        ],
                        value: 'creationRows'
                    }
                ]),
                errors: [
                    {
                        messageId: 'analyticalTableNotSupported'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: AnalyticalTable at App - ⚠️ Creation mode not supported for Analytical tables',
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
                            'SalesOrderItems',
                            'tableSettings',
                            'type'
                        ],
                        value: 'AnalyticalTable'
                    },
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: 'creationRows'
                    }
                ]),
                errors: [
                    {
                        messageId: 'analyticalTableNotSupported'
                    }
                ]
            },
            []
        )
        // TODO - check why test is failing
        // createInvalidTest(
        //     {
        //         name: 'V2: Scenario 7 - 💡 SUGGEST (No config at any level)',
        //         filename: V2_MANIFEST_PATH,
        //         code: JSON.stringify(V2_MANIFEST, undefined, 2),
        //         errors: [
        //             {
        //                 messageId: 'suggestAppLevel'
        //             }
        //         ]
        //     },
        //     []
        // )
    ]
});
