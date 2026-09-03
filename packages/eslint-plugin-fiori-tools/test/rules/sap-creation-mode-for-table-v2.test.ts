import createTableRule from '../../src/rules/sap-creation-mode-for-table.js';
import { RuleTester } from 'eslint';
import { meta, languages } from '../../src/index.js';
import { getManifestAsCode, setup, V2_MANIFEST, V2_MANIFEST_PATH } from '../test-helper.js';

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
                name: 'Scenario 1 - ✅ Valid at Section → ✅ PASS (Section stops flow)',
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
                name: 'Scenario 3 - ✅ Valid at Page → ✅ PASS (Page stops flow)',
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
                name: 'Scenario 5 - ✅ Valid at App → ✅ PASS (App validated)',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: 'creationRows'
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'AnalyticalTable without createMode at Section - ✅ PASS when app-level createMode exists',
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
                ])
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'Scenario 2 - ⚠️ Invalid at Section → ⚠️ WARN (Section stops flow)',
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
                            'SalesOrderItems',
                            'createMode'
                        ],
                        value: 'creationRows'
                    }
                ]),
                errors: [
                    {
                        message:
                            'Invalid createMode value: "badValue" in Products section. The recommended value is "creationRows". Valid values are: creationRows, creationRowsHiddenInEditMode, newPage.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'Scenario 4 - ⚠️ Invalid at Page → ⚠️ WARN (Page stops flow)',
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
                            'createMode'
                        ],
                        value: 'creationRows'
                    }
                ]),
                errors: [
                    {
                        message:
                            'Invalid createMode value: "badValue". The recommended value is "creationRows". Valid values are: creationRows, creationRowsHiddenInEditMode, newPage.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'Scenario 6 - ⚠️ Invalid at App → ⚠️ WARN (App validated)',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: 'badValue'
                    }
                ]),
                output: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: 'creationRows'
                    }
                ]),
                errors: [
                    {
                        message:
                            'Invalid createMode value: "badValue". The recommended value is "creationRows". Valid values are: creationRows, creationRowsHiddenInEditMode, newPage.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'AnalyticalTable at Section - ⚠️ Creation mode not supported for Analytical tables',
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
                            'SalesOrderItems',
                            'tableSettings',
                            'type'
                        ],
                        value: 'AnalyticalTable'
                    }
                ]),
                errors: [
                    {
                        message:
                            'Creation mode is not supported for analytical tables. Remove the createMode or creationMode property.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'AnalyticalTable at Page - ⚠️ Creation mode not supported for Analytical tables',
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
                            'SalesOrderItems',
                            'tableSettings',
                            'type'
                        ],
                        value: 'AnalyticalTable'
                    }
                ]),
                errors: [
                    {
                        message:
                            'Creation mode is not supported for analytical tables. Remove the createMode or creationMode property.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'Scenario 7 - 💡 SUGGEST (No config at any level)',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: ''
                    }
                ]),
                output: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: 'creationRows'
                    }
                ]),
                errors: [
                    {
                        message: 'Consider adding createMode at the application level for a better user experience.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'Report on parent level',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: ''
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
                            'SalesOrderItems'
                            // here createMode is missing, report on parent e.g. SalesOrderItems
                        ],
                        value: 'badValue'
                    }
                ]),
                output: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                        value: 'creationRows'
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
                            'SalesOrderItems'
                        ],
                        value: 'badValue'
                    }
                ]),
                errors: [
                    {
                        message: 'Consider adding createMode at the application level for a better user experience.'
                    }
                ]
            },
            []
        )
    ]
});
