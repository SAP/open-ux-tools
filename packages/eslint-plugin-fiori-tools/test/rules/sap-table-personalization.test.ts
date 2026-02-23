import { RuleTester } from 'eslint';
import tablePersonalizationRule from '../../src/rules/sap-table-personalization';
import { meta, languages } from '../../src/index';
import {
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

const FACETSV4 = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_ANNOTATIONS)
};

const TEST_NAME = 'sap-table-personalization';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, tablePersonalizationRule, {
    valid: [
        createValidTest(
            {
                name: 'V4 - table personalization missing',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - list report page table - personalization is true',
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
                            'personalization'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V4 - object page table - personalization is true',
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
                            'personalization'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V4 - list report page - AnalyticalTable + minUI5=1.108 - group is true',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.108.1'
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
                            'type'
                        ],
                        value: 'AnalyticalTable'
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
                            'personalization',
                            'group'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V4 - list report page - ResponsiveTable + minUI5=1.120 - group is true',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.120.1'
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
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
                            'personalization',
                            'group'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V4 - list report page - GridTable - group is false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.108.1'
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
                            'type'
                        ],
                        value: 'GridTable'
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
                            'personalization',
                            'group'
                        ],
                        value: false
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V4 - list report page - AnalyticalTable + minUI5=1.107 - group is false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.107.1'
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
                            'type'
                        ],
                        value: 'AnalyticalTable'
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
                            'personalization',
                            'group'
                        ],
                        value: false
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V4 - list report page - ResponsiveTable + minUI5=1.119 - group is false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.107.1'
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
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
                            'personalization',
                            'group'
                        ],
                        value: false
                    }
                ])
            },
            [FACETSV4]
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4 - list report page table - personalization is false',
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
                            'personalization'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-table-personalization',
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
                            'tableSettings',
                            'personalization'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),
        createInvalidTest(
            {
                name: 'V4 - object page table - personalization is {} - all properties disabled',
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
                            'personalization'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-table-personalization',
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
                            'tableSettings',
                            'personalization'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),
        createInvalidTest(
            {
                name: 'V4 - list report page - Analytical table - all personalization properties are false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.109.1'
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
                            'type'
                        ],
                        value: 'AnalyticalTable'
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
                            'personalization'
                        ],
                        value: {
                            column: false,
                            filter: false,
                            group: false,
                            sort: false
                        }
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-table-personalization-column',
                        line: 128,
                        column: 23
                    },
                    {
                        messageId: 'sap-table-personalization-filter',
                        line: 129,
                        column: 23
                    },
                    {
                        messageId: 'sap-table-personalization-group',
                        line: 130,
                        column: 23
                    },
                    {
                        messageId: 'sap-table-personalization-sort',
                        line: 131,
                        column: 23
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.109.1'
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
                            'type'
                        ],
                        value: 'AnalyticalTable'
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
                            'personalization'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),
        createInvalidTest(
            {
                name: 'V4 - list report page - Responsive table - group is false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.121.1'
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
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
                            'personalization'
                        ],
                        value: {
                            group: false
                        }
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-table-personalization-group',
                        line: 128,
                        column: 23
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.121.1'
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
                            'type'
                        ],
                        value: 'ResponsiveTable'
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
                            'personalization'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        )
    ]
});
