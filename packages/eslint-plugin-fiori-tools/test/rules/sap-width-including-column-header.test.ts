import { RuleTester } from 'eslint';
import widthIncludingColumnHeaderRule from '../../src/rules/sap-width-including-column-header';
import { meta, languages } from '../../src/index';
import {
    CAP_ANNOTATIONS,
    CAP_ANNOTATIONS_PATH,
    CAP_APP_PATH,
    CAP_FACETS_ANNOTATIONS,
    CAP_MANIFEST,
    CAP_MANIFEST_PATH,
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_FACETS_ANNOTATIONS,
    V4_MANIFEST,
    V4_MANIFEST_PATH
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const _6_COLUMNS_ANNOTATIONS = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(
        V4_ANNOTATIONS,
        `
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.LineItem">
                    <Collection>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="identifier"/>
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="title"/>
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="category_code"/>
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="priority_code"/>
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="incidentStatus_code"/>
                        </Record>
                         <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="incidentStatus_code"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
                `
    )
};

const FACETS = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_ANNOTATIONS)
};

const _3_COLUMS_CDS = `
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: title,
    },
    {
        $Type: 'UI.DataField',
        Value: category_code,
        Label: 'CatCode',
    },
    {
        $Type : 'UI.DataField',
        Value : createdAt,
    }
]);
`;

const ORIGINAL_ANNOTATIONS = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, '')
};

const TEST_NAME = 'sap-width-including-column-header';
const { createValidTest, createInvalidTest } = setup(`${TEST_NAME} - XML`);

ruleTester.run(`${TEST_NAME} - XML`, widthIncludingColumnHeaderRule, {
    valid: [
        // Non-manifest files should be ignored
        createValidTest(
            {
                name: 'non manifest file - json',
                filename: 'some-other-file.json',
                code: JSON.stringify(V4_MANIFEST)
            },
            []
        ),
        createValidTest(
            {
                name: 'non manifest file - xml',
                filename: 'some-other-file.xml',
                code: ''
            },
            []
        ),
        createValidTest(
            {
                name: 'widthIncludingColumnHeader set to true for small table',
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
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    }
                ])
            },
            [ORIGINAL_ANNOTATIONS]
        ),
        createValidTest(
            {
                name: 'table with 6 columns',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST)
            },
            [_6_COLUMNS_ANNOTATIONS]
        ),
        createValidTest(
            {
                name: 'ui5 version lower than 1.120 - no warning for small table',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [])
            },
            [ORIGINAL_ANNOTATIONS]
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'widthIncludingColumnHeader missing for small table',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.120.0'
                    }
                ]),
                errors: [
                    {
                        messageId: 'width-including-column-header-manifest',
                        line: 124,
                        column: 19
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.120.0'
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
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings'
                        ],
                        value: {
                            'widthIncludingColumnHeader': true,
                            'type': 'ResponsiveTable',
                            'selectionMode': 'Auto'
                        }
                    }
                ])
            },
            [ORIGINAL_ANNOTATIONS]
        ),
        createInvalidTest(
            {
                name: 'small object page table (annotation file)',
                ...FACETS,
                errors: [
                    {
                        messageId: 'width-including-column-header',
                        line: 29,
                        column: 18
                    }
                ]
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [
                        {
                            path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                            value: '1.120.0'
                        }
                    ])
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'small object page table',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.120.0'
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
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    }
                ]),
                errors: [
                    {
                        messageId: 'width-including-column-header-manifest',
                        line: 139,
                        column: 13
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.120.0'
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
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    },
                    {
                        path: ['sap.ui5', 'routing', 'targets', 'IncidentsObjectPage', 'options', 'settings'],
                        value: {
                            controlConfiguration: {
                                'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem': {
                                    tableSettings: {
                                        widthIncludingColumnHeader: true
                                    }
                                }
                            },
                            editableHeaderContent: false,
                            entitySet: 'Incidents',
                            showDraftToggle: true
                        }
                    }
                ])
            },
            [FACETS]
        )
    ]
});

const { createValidTest: createValidTestCAP, createInvalidTest: createInvalidTestCAP } = setup(
    `${TEST_NAME} - CAP`,
    CAP_APP_PATH
);

ruleTester.run(`${TEST_NAME} - CAP`, widthIncludingColumnHeaderRule, {
    valid: [
        // Non-manifest files should be ignored
        createValidTestCAP(
            {
                name: 'non manifest file - json',
                filename: 'some-other-file.json',
                code: JSON.stringify(V4_MANIFEST)
            },
            []
        ),
        createValidTestCAP(
            {
                name: 'non manifest file - cds',
                filename: 'some-other-file.cds',
                code: ''
            },
            []
        ),
        createValidTestCAP(
            {
                name: 'widthIncludingColumnHeader set to true for small table',
                filename: CAP_MANIFEST_PATH,
                code: getManifestAsCode(CAP_MANIFEST, [
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
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    }
                ])
            },
            []
        ),
        createValidTestCAP(
            {
                name: 'table with 6 columns',
                filename: CAP_MANIFEST_PATH,
                code: JSON.stringify(CAP_MANIFEST)
            },
            []
        ),
        createValidTestCAP(
            {
                name: 'ui5 version lower than 1.120 - no warning for small table',
                filename: CAP_MANIFEST_PATH,
                code: getManifestAsCode(CAP_MANIFEST, [])
            },
            []
        )
    ],

    invalid: [
        createInvalidTestCAP(
            {
                name: 'widthIncludingColumnHeader missing for small table',
                filename: CAP_MANIFEST_PATH,
                code: getManifestAsCode(CAP_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.120.0'
                    }
                ]),
                errors: [
                    {
                        messageId: 'width-including-column-header-manifest',
                        line: 114,
                        column: 17
                    }
                ],
                output: getManifestAsCode(CAP_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.120.0'
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
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    }
                ])
            },
            [
                {
                    filename: CAP_ANNOTATIONS_PATH,
                    code: CAP_ANNOTATIONS + _3_COLUMS_CDS
                }
            ]
        ),
        createInvalidTestCAP(
            {
                name: 'small object page table (annotation file)',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_FACETS_ANNOTATIONS,
                errors: [
                    {
                        messageId: 'width-including-column-header',
                        line: 53,
                        column: 38
                    }
                ]
                // no fix in .cds file
            },
            [
                {
                    filename: CAP_MANIFEST_PATH,
                    code: getManifestAsCode(CAP_MANIFEST, [
                        {
                            path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                            value: '1.120.0'
                        }
                    ])
                },
                {
                    filename: CAP_ANNOTATIONS_PATH,
                    code: CAP_ANNOTATIONS + CAP_FACETS_ANNOTATIONS
                }
            ]
        ),
        createInvalidTestCAP(
            {
                name: 'small object page table',
                filename: CAP_MANIFEST_PATH,
                code: getManifestAsCode(CAP_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.120.0'
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
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    }
                ]),
                errors: [
                    {
                        messageId: 'width-including-column-header-manifest',
                        line: 128,
                        column: 13
                    }
                ],
                output: getManifestAsCode(CAP_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.120.0'
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
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    },
                    {
                        path: ['sap.ui5', 'routing', 'targets', 'IncidentsObjectPage', 'options', 'settings'],
                        value: {
                            controlConfiguration: {
                                'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem#table_section': {
                                    tableSettings: {
                                        widthIncludingColumnHeader: true
                                    }
                                }
                            },
                            editableHeaderContent: false,
                            contextPath: '/Incidents'
                        }
                    }
                ])
            },
            [
                {
                    filename: CAP_ANNOTATIONS_PATH,
                    code: CAP_ANNOTATIONS + CAP_FACETS_ANNOTATIONS
                }
            ]
        )
    ]
});
