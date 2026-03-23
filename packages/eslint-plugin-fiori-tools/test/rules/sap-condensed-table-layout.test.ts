import { RuleTester } from 'eslint';
import condensedTableLayoutRule from '../../src/rules/sap-condensed-table-layout';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_FACETS_ANNOTATIONS,
    V4_MANIFEST,
    V4_MANIFEST_PATH,
    V2_MANIFEST,
    V2_MANIFEST_PATH
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const FACETSV4 = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_ANNOTATIONS)
};

const TEST_NAME = 'sap-condensed-table-layout';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// Paths to IncidentsObjectPage table settings in the V4 manifest
const OBJECT_PAGE_TABLE_SETTINGS_PATH = [
    'sap.ui5',
    'routing',
    'targets',
    'IncidentsObjectPage',
    'options',
    'settings',
    'controlConfiguration',
    'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem',
    'tableSettings'
];

// Paths to IncidentsList table settings in the V4 manifest
const LIST_REPORT_TABLE_SETTINGS_PATH = [
    'sap.ui5',
    'routing',
    'targets',
    'IncidentsList',
    'options',
    'settings',
    'controlConfiguration',
    '@com.sap.vocabularies.UI.v1.LineItem',
    'tableSettings'
];

// Path to V2 ALP table type
const V2_TABLE_TYPE_PATH = [
    'sap.ui.generic.app',
    'pages',
    'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
    'component',
    'settings',
    'tableSettings',
    'type'
];

const V2_CONDENSED_TABLE_LAYOUT_PATH = [
    'sap.ui.generic.app',
    'pages',
    'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
    'component',
    'settings',
    'condensedTableLayout'
];

ruleTester.run(TEST_NAME, condensedTableLayoutRule, {
    valid: [
        createValidTest(
            {
                name: 'V4 - no table type set (orphan table) - no issue',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - GridTable on list report with condensedTableLayout true',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [...LIST_REPORT_TABLE_SETTINGS_PATH, 'type'],
                        value: 'GridTable'
                    },
                    {
                        path: [...LIST_REPORT_TABLE_SETTINGS_PATH, 'condensedTableLayout'],
                        value: true
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - GridTable on object page without condensedTableLayout - not checked',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [...OBJECT_PAGE_TABLE_SETTINGS_PATH, 'type'],
                        value: 'GridTable'
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V2 - no tableSettings.type set - no issue',
                filename: V2_MANIFEST_PATH,
                code: JSON.stringify(V2_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - GridTable with condensedTableLayout true',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: V2_TABLE_TYPE_PATH,
                        value: 'GridTable'
                    }
                    // condensedTableLayout is already true in V2_MANIFEST
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - ResponsiveTable type - condensedTableLayout not required',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: V2_TABLE_TYPE_PATH,
                        value: 'ResponsiveTable'
                    },
                    {
                        path: V2_CONDENSED_TABLE_LAYOUT_PATH,
                        value: false
                    }
                ])
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4 - GridTable on list report without condensedTableLayout',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [...LIST_REPORT_TABLE_SETTINGS_PATH, 'type'],
                        value: 'GridTable'
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-condensed-table-layout'
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: LIST_REPORT_TABLE_SETTINGS_PATH,
                        value: { condensedTableLayout: true, type: 'GridTable', selectionMode: 'Auto' }
                    }
                ])
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4 - AnalyticalTable on list report without condensedTableLayout',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [...LIST_REPORT_TABLE_SETTINGS_PATH, 'type'],
                        value: 'AnalyticalTable'
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-condensed-table-layout'
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: LIST_REPORT_TABLE_SETTINGS_PATH,
                        value: { condensedTableLayout: true, type: 'AnalyticalTable', selectionMode: 'Auto' }
                    }
                ])
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4 - GridTable on list report with condensedTableLayout false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [...LIST_REPORT_TABLE_SETTINGS_PATH, 'type'],
                        value: 'GridTable'
                    },
                    {
                        path: [...LIST_REPORT_TABLE_SETTINGS_PATH, 'condensedTableLayout'],
                        value: false
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-condensed-table-layout'
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [...LIST_REPORT_TABLE_SETTINGS_PATH, 'type'],
                        value: 'GridTable'
                    },
                    {
                        path: [...LIST_REPORT_TABLE_SETTINGS_PATH, 'condensedTableLayout'],
                        value: true
                    }
                ])
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2 - GridTable without condensedTableLayout true',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: V2_TABLE_TYPE_PATH,
                        value: 'GridTable'
                    },
                    {
                        path: V2_CONDENSED_TABLE_LAYOUT_PATH,
                        value: false
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-condensed-table-layout'
                    }
                ],
                output: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: V2_TABLE_TYPE_PATH,
                        value: 'GridTable'
                    },
                    {
                        path: V2_CONDENSED_TABLE_LAYOUT_PATH,
                        value: true
                    }
                ])
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2 - AnalyticalTable without condensedTableLayout true',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: V2_TABLE_TYPE_PATH,
                        value: 'AnalyticalTable'
                    },
                    {
                        path: V2_CONDENSED_TABLE_LAYOUT_PATH,
                        value: false
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-condensed-table-layout'
                    }
                ],
                output: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: V2_TABLE_TYPE_PATH,
                        value: 'AnalyticalTable'
                    },
                    {
                        path: V2_CONDENSED_TABLE_LAYOUT_PATH,
                        value: true
                    }
                ])
            },
            []
        )
    ]
});
