import { RuleTester } from 'eslint';
import enableExportRule from '../../src/rules/sap-enable-export.js';
import { meta, languages } from '../../src/index.js';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V2_FLEX_CHANGE_CONTENT,
    V2_FLEX_CHANGE_FILE_PATH,
    V2_MANIFEST,
    V2_MANIFEST_PATH,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_FACETS_ANNOTATIONS,
    V4_MANIFEST,
    V4_MANIFEST_PATH,
    V4_SECOND_TABLE_ANNOTATION
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const FACETSV4 = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_ANNOTATIONS)
};

const TEST_NAME = 'sap-enable-export';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

type PropertyName = 'enableExport' | 'useExportToExcel';

const v2FlexChangeExportEnabledOP = (property: PropertyName) => ({
    ...V2_FLEX_CHANGE_CONTENT,
    content: { ...V2_FLEX_CHANGE_CONTENT.content, property },
    selector: {
        ...V2_FLEX_CHANGE_CONTENT.selector,
        id: 'v2xmlstart::sap.suite.ui.generic.template.ObjectPage.view.Details::Z_SEPMRA_SO_SALESORDERANALYSIS--Products::Table'
    }
});

const v2FlexChangeExportEnabledLR = (property: PropertyName) => ({
    ...v2FlexChangeExportEnabledOP(property),
    selector: {
        ...v2FlexChangeExportEnabledOP(property).selector,
        id: 'v2xmlstart::sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage::Z_SEPMRA_SO_SALESORDERANALYSIS--listReport'
    }
});

const v2FlexChangeExportDisabledOP = (property: PropertyName) => ({
    ...v2FlexChangeExportEnabledOP(property),
    content: { ...v2FlexChangeExportEnabledOP(property).content, newValue: false }
});

const v2FlexChangeExportDisabledLR = (property: PropertyName) => ({
    ...v2FlexChangeExportEnabledLR(property),
    content: { ...v2FlexChangeExportEnabledLR(property).content, newValue: false }
});

ruleTester.run(TEST_NAME, enableExportRule, {
    valid: [
        createValidTest(
            {
                name: 'V4 - enableExport missing',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - object page table - enableExport is true',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsObjectPage',
                            'options',
                            'settings',
                            'controlConfiguration',
                            'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'enableExport'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V2 - enableExport missing',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(V2_FLEX_CHANGE_CONTENT, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - object page table - enableExport is true on object page',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportEnabledOP('enableExport'), undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - object page table - enableExport is true on list report page',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportEnabledLR('enableExport'), undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - object page table - useExportToExcel is true on object page - minUI5Version < 1.145',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportEnabledOP('useExportToExcel'), undefined, 2)
            },
            [
                {
                    filename: V2_MANIFEST_PATH,
                    code: getManifestAsCode(V2_MANIFEST, [
                        {
                            path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                            value: '1.120.0'
                        }
                    ])
                }
            ]
        ),
        createValidTest(
            {
                name: 'V2 - object page table - useExportToExcel is true on list report page - minUI5Version < 1.145',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportEnabledLR('useExportToExcel'), undefined, 2)
            },
            [
                {
                    filename: V2_MANIFEST_PATH,
                    code: getManifestAsCode(V2_MANIFEST, [
                        {
                            path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                            value: '1.120.0'
                        }
                    ])
                }
            ]
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4 - list report page - enableExport is false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsList',
                            'options',
                            'settings',
                            'controlConfiguration',
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'enableExport'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        message: 'Export functionality in the table must be enabled',
                        line: 127,
                        column: 21
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsList',
                            'options',
                            'settings',
                            'controlConfiguration',
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings'
                        ],
                        value: {
                            type: 'ResponsiveTable',
                            selectionMode: 'Auto'
                            // enableExport property removed
                        }
                    }
                ])
            },
            [FACETSV4]
        ),
        createInvalidTest(
            {
                name: 'V4 - list report page - multiview: enableExport is false in 2 tables',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsList',
                            'options',
                            'settings',
                            'controlConfiguration',
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'enableExport'
                        ],
                        value: false
                    },
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsList',
                            'options',
                            'settings',
                            'controlConfiguration',
                            '@com.sap.vocabularies.UI.v1.LineItem#secondTable',
                            'tableSettings',
                            'enableExport'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        message: 'Export functionality in the table must be enabled',
                        line: 127,
                        column: 21
                    },
                    {
                        message: 'Export functionality in the table must be enabled',
                        line: 132,
                        column: 21
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsList',
                            'options',
                            'settings',
                            'controlConfiguration',
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings'
                        ],
                        value: {
                            type: 'ResponsiveTable',
                            selectionMode: 'Auto'
                            // enableExport property removed
                        }
                    },
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsList',
                            'options',
                            'settings',
                            'controlConfiguration',
                            '@com.sap.vocabularies.UI.v1.LineItem#secondTable',
                            'tableSettings'
                        ],
                        value: {
                            // enableExport property removed
                        }
                    }
                ])
            },
            [
                {
                    filename: V4_ANNOTATIONS_PATH,
                    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_SECOND_TABLE_ANNOTATION)
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V4 - object page - enableExport is false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsObjectPage',
                            'options',
                            'settings',
                            'controlConfiguration',
                            'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'enableExport'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        message: 'Export functionality in the Products table must be enabled',
                        line: 145,
                        column: 21
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsObjectPage',
                            'options',
                            'settings',
                            'controlConfiguration',
                            'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings'
                        ],
                        value: {
                            // enableExport property removed
                        }
                    }
                ])
            },
            [FACETSV4]
        ),
        createInvalidTest(
            {
                name: 'V2 - list report page - enableExport is false',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportDisabledLR('enableExport'), undefined, 2),
                errors: [
                    {
                        message: 'Export functionality in the table must be enabled',
                        line: 10,
                        column: 5
                    }
                ],
                output: JSON.stringify(v2FlexChangeExportEnabledLR('enableExport'), undefined, 2)
            },
            [
                {
                    filename: V2_MANIFEST_PATH,
                    code: getManifestAsCode(V2_MANIFEST, [
                        {
                            path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                            value: '1.146.0'
                        }
                    ])
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V2 - object page - enableExport is false',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportDisabledOP('enableExport'), undefined, 2),
                errors: [
                    {
                        message: 'Export functionality in the Products table must be enabled',
                        line: 10,
                        column: 5
                    }
                ],
                output: JSON.stringify(v2FlexChangeExportEnabledOP('enableExport'), undefined, 2)
            },
            [
                {
                    filename: V2_MANIFEST_PATH,
                    code: getManifestAsCode(V2_MANIFEST, [
                        {
                            path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                            // Boundary test: at exactly 1.145.0, 'enableExport' must be used (not 'useExportToExcel')
                            value: '1.145.0'
                        }
                    ])
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V2 - list report page - useExportToExcel is false - UI5Version < 1.145',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportDisabledLR('useExportToExcel'), undefined, 2),
                errors: [
                    {
                        message: 'Export functionality in the table must be enabled',
                        line: 10,
                        column: 5
                    }
                ],
                output: JSON.stringify(v2FlexChangeExportEnabledLR('useExportToExcel'), undefined, 2)
            },
            [
                {
                    filename: V2_MANIFEST_PATH,
                    code: getManifestAsCode(V2_MANIFEST, [
                        {
                            path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                            value: '1.144.0'
                        }
                    ])
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V2 - object page - useExportToExcel is false - UI5Version < 1.145',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportDisabledOP('useExportToExcel'), undefined, 2),
                errors: [
                    {
                        message: 'Export functionality in the Products table must be enabled',
                        line: 10,
                        column: 5
                    }
                ],
                output: JSON.stringify(v2FlexChangeExportEnabledOP('useExportToExcel'), undefined, 2)
            },
            [
                {
                    filename: V2_MANIFEST_PATH,
                    code: getManifestAsCode(V2_MANIFEST, [
                        {
                            path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                            value: '1.142.0'
                        }
                    ])
                }
            ]
        )
    ]
});
