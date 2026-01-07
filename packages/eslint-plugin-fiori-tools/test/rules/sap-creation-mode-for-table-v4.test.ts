import createTableRule from '../../src/rules/sap-creation-mode-for-table';
import { RuleTester } from 'eslint';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_MANIFEST,
    V4_MANIFEST_PATH
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-creation-mode-for-table-v4';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// Helper annotations for List Report table
const LIST_REPORT_TABLE_ANNOTATIONS = {
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
                    </Collection>
                </Annotation>
            </Annotations>
        `
    )
};

// Helper annotations for Object Page sections with tables
const OBJECT_PAGE_FACETS = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(
        V4_ANNOTATIONS,
        `
            <Annotations Target="IncidentService.Incidents">
                 <Annotation Term="UI.Facets" >
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="IncidentFlowSection"/>
                            <PropertyValue Property="Label" String="Incident Flow"/>
                            <PropertyValue Property="Target" AnnotationPath="incidentFlow/@UI.LineItem"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
            <Annotations Target="IncidentService.IncidentFlow">
                 <Annotation Term="UI.LineItem">
                    <Collection>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="processStep" />
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="stepStatus" />
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
        `
    )
};

//------------------------------------------------------------------------------
// FE V4 Tests - Responsive Table / Grid Table
//------------------------------------------------------------------------------
ruleTester.run(TEST_NAME, createTableRule, {
    valid: [
        // Object Page - Valid creationMode. InlineCreationRows for ResponsiveTable
        createValidTest(
            {
                name: 'Object Page: ✅ Valid at Page level (creationMode) → ✅ PASS - InlineCreationRows for ResponsiveTable',
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'InlineCreationRows'
                    }
                ])
            },
            [OBJECT_PAGE_FACETS]
        ),
        // Object Page - Valid creationMode. InlineCreationRows for GridTable
        createValidTest(
            {
                name: 'Object Page: ✅ Valid at Page level (creationMode) → ✅ PASS - InlineCreationRows for GridTable',
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
                            'type'
                        ],
                        value: 'GridTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'InlineCreationRows'
                    }
                ])
            },
            [OBJECT_PAGE_FACETS]
        ),
        // Tree Table - Valid creationMode. Inline for TreeTable
        createValidTest(
            {
                name: 'Object Page: ✅ Valid at Page level (creationMode) → ✅ PASS - Inline for TreeTable',
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
                            'type'
                        ],
                        value: 'TreeTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'Inline'
                    }
                ])
            },
            [OBJECT_PAGE_FACETS]
        ),
        // Application level tests - Valid at App level (defaultCreationMode)
        createValidTest(
            {
                name: 'Object Page: ✅ Valid at App level (defaultCreationMode) → ✅ PASS - InlineCreationRows for ResponsiveTable',
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    },
                    {
                        path: ['sap.fe', 'macros', 'table', 'defaultCreationMode'],
                        value: 'InlineCreationRows'
                    }
                ])
            },
            [OBJECT_PAGE_FACETS]
        )
    ],
    invalid: [
        // Invalid creationMode for ResponsiveTable/GridTable
        createInvalidTest(
            {
                name: 'Object Page: ⚠️ Invalid at Page level (creationMode) → ⚠️ WARN - InvalidMode for ResponsiveTable',
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'InvalidMode'
                    }
                ]),
                errors: [
                    {
                        messageId: 'invalidCreateModeV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        // Recommend InlineCreationRows over NewPage
        createInvalidTest(
            {
                name: 'Object Page: 💡 Recommend at Page level (creationMode) → ⚠️ WARN - InlineCreationRows over NewPage for GridTable',
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
                            'type'
                        ],
                        value: 'GridTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'NewPage'
                    }
                ]),
                errors: [
                    {
                        messageId: 'recommendInlineCreationRowsV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        // Invalid creationMode for TreeTable
        createInvalidTest(
            {
                name: 'Object Page: ⚠️ Invalid at Page level (creationMode) → ⚠️ WARN - InlineCreationRows for TreeTable',
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
                            'type'
                        ],
                        value: 'TreeTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'InlineCreationRows'
                    }
                ]),
                errors: [
                    {
                        messageId: 'invalidCreateModeV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        // Recommend Inline over NewPage for TreeTable
        createInvalidTest(
            {
                name: 'Object Page: 💡 Recommend at Page level (creationMode) → ⚠️ WARN - Inline over NewPage for TreeTable',
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
                            'type'
                        ],
                        value: 'TreeTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'NewPage'
                    }
                ]),
                errors: [
                    {
                        messageId: 'recommendInlineCreationRowsV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        createInvalidTest(
            {
                name: 'Object Page: ⚠️ Invalid at Page level (creationMode) → ⚠️ WARN - Creation mode not supported for AnalyticalTable',
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
                            'type'
                        ],
                        value: 'AnalyticalTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'NewPage'
                    }
                ]),
                errors: [
                    {
                        messageId: 'analyticalTableNotSupported'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        // Recommend better values
        createInvalidTest(
            {
                name: 'Object Page: 💡 Recommend at Page level (creationMode) → ⚠️ WARN - InlineCreationRows over NewPage for ResponsiveTable',
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'NewPage'
                    }
                ]),
                errors: [
                    {
                        messageId: 'recommendInlineCreationRowsV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        createInvalidTest(
            {
                name: 'Object Page: 💡 Recommend at Page level (creationMode) → ⚠️ WARN - Inline over CreationDialog for TreeTable',
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
                            'type'
                        ],
                        value: 'TreeTable'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'CreationDialog'
                    }
                ]),
                errors: [
                    {
                        messageId: 'recommendInlineCreationRowsV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        createInvalidTest(
            {
                name: 'Object Page: - 💡 Suggest adding creationMode',
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    },
                    {
                        path: ['sap.fe', 'macros', 'table'],
                        value: ''
                    }
                ]),
                errors: [
                    {
                        messageId: 'suggestAppLevelV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        // Application level tests - Invalid/Warning
        createInvalidTest(
            {
                name: 'Object Page: 💡 Recommend at App level (defaultCreationMode) → ⚠️ WARN - InlineCreationRows over NewPage for TreeTable',
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
                            'type'
                        ],
                        value: 'TreeTable'
                    },
                    {
                        path: ['sap.fe', 'macros', 'table', 'defaultCreationMode'],
                        value: 'NewPage'
                    }
                ]),
                errors: [
                    {
                        messageId: 'recommendInlineCreationRowsV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        createInvalidTest(
            {
                name: 'Object Page: ⚠️ Invalid at App level (defaultCreationMode) → ⚠️ WARN - InvalidMode for ResponsiveTable',
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    },
                    {
                        path: ['sap.fe', 'macros', 'table', 'defaultCreationMode'],
                        value: 'InvalidMode'
                    }
                ]),
                errors: [
                    {
                        messageId: 'invalidCreateModeV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        createInvalidTest(
            {
                name: 'Object Page: ⚠️ Invalid at App level (defaultCreationMode) → ⚠️ WARN - Creation mode not supported for AnalyticalTable',
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
                            'type'
                        ],
                        value: 'AnalyticalTable'
                    },
                    {
                        path: ['sap.fe', 'macros', 'table', 'defaultCreationMode'],
                        value: 'InlineCreationRows'
                    }
                ]),
                errors: [
                    {
                        messageId: 'analyticalTableNotSupported'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        createInvalidTest(
            {
                name: 'Object Page: Page level overrides App level (defaultCreationMode) → ⚠️ WARN - Page level takes priority',
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
                    },
                    {
                        path: ['sap.fe', 'macros', 'table', 'defaultCreationMode'],
                        value: 'InlineCreationRows'
                    },
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
                            'creationMode',
                            'name'
                        ],
                        value: 'NewPage'
                    }
                ]),
                errors: [
                    {
                        messageId: 'recommendInlineCreationRowsV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        ),
        createInvalidTest(
            {
                name: 'Report on parent level',
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
                            'type'
                        ],
                        value: 'TreeTable'
                    },
                    {
                        path: ['sap.fe', 'macros'],
                        value: ''
                    }
                ]),
                errors: [
                    {
                        messageId: 'suggestAppLevelV4'
                    }
                ]
            },
            [OBJECT_PAGE_FACETS]
        )
    ]
});
