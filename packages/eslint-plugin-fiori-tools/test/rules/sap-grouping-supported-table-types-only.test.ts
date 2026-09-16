import { RuleTester } from 'eslint';
import groupingSupportedTableTypesOnly from '../../src/rules/sap-grouping-supported-table-types-only.js';
import { meta, languages } from '../../src/index.js';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    CAP_ANNOTATIONS,
    CAP_ANNOTATIONS_PATH,
    CAP_APP_PATH,
    CAP_MANIFEST,
    CAP_MANIFEST_PATH,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
    V2_MANIFEST,
    V2_MANIFEST_PATH,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_MANIFEST,
    V4_MANIFEST_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-grouping-supported-table-types-only';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

const ERROR_MESSAGE_GRID_TABLE =
    'Grouping is not supported for "GridTable" table type. Disable grouping or use "AnalyticalTable" or "ResponsiveTable" table type instead.';
const ERROR_MESSAGE_TREE_TABLE =
    'Grouping is not supported for "TreeTable" table type. Disable grouping or use "AnalyticalTable" or "ResponsiveTable" table type instead.';

const V4_TABLE_TYPE_PATH = [
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
];

const V4_PERSONALIZATION_PATH = [
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
];

const V2_TABLE_TYPE_PATH = [
    'sap.ui.generic.app',
    'pages',
    'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
    'component',
    'settings',
    'tableSettings',
    'type'
];

function makeV4GroupByAnnotation(qualifier?: string): string {
    const qualifierAttr = qualifier ? ` Qualifier="${qualifier}"` : '';
    return `
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.PresentationVariant"${qualifierAttr}>
                    <Record Type="UI.PresentationVariantType">
                        <PropertyValue Property="GroupBy">
                            <Collection>
                                <PropertyPath>title</PropertyPath>
                            </Collection>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>`;
}

const V4_PRESENTATION_VARIANT_EMPTY_GROUPBY = `
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.PresentationVariant">
                    <Record Type="UI.PresentationVariantType">
                        <PropertyValue Property="GroupBy">
                            <Collection/>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>`;

const V4_PRESENTATION_VARIANT_NO_GROUPBY = `
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.PresentationVariant">
                    <Record Type="UI.PresentationVariantType">
                        <PropertyValue Property="SortOrder">
                            <Collection>
                                <Record Type="Common.SortOrderType">
                                    <PropertyValue Property="Property" PropertyPath="title" />
                                </Record>
                            </Collection>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>`;

function makeV2GroupByAnnotation(qualifier: string): string {
    return `
            <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
                <Annotation Term="UI.PresentationVariant" Qualifier="${qualifier}">
                    <Record Type="UI.PresentationVariantType">
                        <PropertyValue Property="GroupBy">
                            <Collection>
                                <PropertyPath>SoldToParty</PropertyPath>
                            </Collection>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>`;
}

ruleTester.run(TEST_NAME, groupingSupportedTableTypesOnly, {
    valid: [
        createValidTest(
            {
                name: 'non-Fiori file is ignored',
                filename: 'some-other-file.json',
                code: '{}'
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: GridTable without PresentationVariant',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'GridTable' }])
                }
            ]
        ),
        createValidTest(
            {
                name: 'V4: GridTable + PresentationVariant without GroupBy',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_PRESENTATION_VARIANT_NO_GROUPBY)
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'GridTable' }])
                }
            ]
        ),
        createValidTest(
            {
                name: 'V4: GridTable + PresentationVariant with empty GroupBy collection',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_PRESENTATION_VARIANT_EMPTY_GROUPBY)
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'GridTable' }])
                }
            ]
        ),
        createValidTest(
            {
                name: 'V4: AnalyticalTable + GroupBy annotation is supported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, makeV4GroupByAnnotation('forAnalytical'))
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'AnalyticalTable' }])
                }
            ]
        ),
        createValidTest(
            {
                name: 'V4: ResponsiveTable + GroupBy annotation is supported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, makeV4GroupByAnnotation('forResponsive'))
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'ResponsiveTable' }])
                }
            ]
        ),
        createValidTest(
            {
                name: 'V4: no tableType set (default) + GroupBy annotation - not flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, makeV4GroupByAnnotation('forDefault'))
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 manifest: GridTable + personalization.group = false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    { path: V4_TABLE_TYPE_PATH, value: 'GridTable' },
                    { path: V4_PERSONALIZATION_PATH, value: { group: false } }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 manifest: GridTable + no personalization set',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'GridTable' }])
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 manifest: AnalyticalTable + personalization.group = true is supported',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    { path: V4_TABLE_TYPE_PATH, value: 'AnalyticalTable' },
                    { path: V4_PERSONALIZATION_PATH, value: { group: true } }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: AnalyticalTable + GroupBy annotation is supported',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, makeV2GroupByAnnotation('forAnalytical'))
            },
            [
                {
                    filename: V2_MANIFEST_PATH,
                    code: getManifestAsCode(V2_MANIFEST, [{ path: V2_TABLE_TYPE_PATH, value: 'AnalyticalTable' }])
                }
            ]
        ),
        createValidTest(
            {
                name: 'V2: default table type (no type set) + GroupBy annotation - not flagged',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, makeV2GroupByAnnotation('forDefault'))
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4: GridTable + GroupBy in PresentationVariant annotation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, makeV4GroupByAnnotation('forGrid')),
                errors: [{ message: ERROR_MESSAGE_GRID_TABLE }]
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'GridTable' }])
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V4: TreeTable + GroupBy in PresentationVariant annotation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, makeV4GroupByAnnotation('forTree')),
                errors: [{ message: ERROR_MESSAGE_TREE_TABLE }]
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'TreeTable' }])
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V4 manifest: GridTable + personalization.group = true',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    { path: V4_TABLE_TYPE_PATH, value: 'GridTable' },
                    { path: V4_PERSONALIZATION_PATH, value: { group: true } }
                ]),
                errors: [{ message: ERROR_MESSAGE_GRID_TABLE }],
                output: getManifestAsCode(V4_MANIFEST, [
                    { path: V4_TABLE_TYPE_PATH, value: 'GridTable' },
                    { path: V4_PERSONALIZATION_PATH, value: {} }
                ])
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: GridTable + GroupBy in PresentationVariant annotation',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, makeV2GroupByAnnotation('forGrid')),
                errors: [{ message: ERROR_MESSAGE_GRID_TABLE }]
            },
            [
                {
                    filename: V2_MANIFEST_PATH,
                    code: getManifestAsCode(V2_MANIFEST, [{ path: V2_TABLE_TYPE_PATH, value: 'GridTable' }])
                }
            ]
        )
    ]
});

// ─── CDS (CAP) tests ─────────────────────────────────────────────────────────

const { createValidTest: createCapValidTest, createInvalidTest: createCapInvalidTest } = setup(
    `${TEST_NAME} - CDS`,
    CAP_APP_PATH
);

function makeCdsGroupByAnnotation(qualifier?: string): string {
    const qualifierPart = qualifier ? ` #${qualifier}` : '';
    return `
annotate service.Incidents with @(
    UI.PresentationVariant${qualifierPart}: {
        GroupBy: [title]
    }
);`;
}

const CDS_PRESENTATION_VARIANT_EMPTY_GROUPBY = `
annotate service.Incidents with @(
    UI.PresentationVariant: {
        GroupBy: []
    }
);`;

const CDS_PRESENTATION_VARIANT_NO_GROUPBY = `
annotate service.Incidents with @(
    UI.PresentationVariant: {
        MaxItems: 5
    }
);`;

ruleTester.run(`${TEST_NAME} - CDS`, groupingSupportedTableTypesOnly, {
    valid: [
        createCapValidTest(
            {
                name: 'CAP: GridTable without PresentationVariant',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS
            },
            [
                {
                    filename: CAP_MANIFEST_PATH,
                    code: getManifestAsCode(CAP_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'GridTable' }])
                }
            ]
        ),
        createCapValidTest(
            {
                name: 'CAP: GridTable + PresentationVariant without GroupBy',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_PRESENTATION_VARIANT_NO_GROUPBY
            },
            [
                {
                    filename: CAP_MANIFEST_PATH,
                    code: getManifestAsCode(CAP_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'GridTable' }])
                }
            ]
        ),
        createCapValidTest(
            {
                name: 'CAP: GridTable + PresentationVariant with empty GroupBy collection',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_PRESENTATION_VARIANT_EMPTY_GROUPBY
            },
            [
                {
                    filename: CAP_MANIFEST_PATH,
                    code: getManifestAsCode(CAP_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'GridTable' }])
                }
            ]
        ),
        createCapValidTest(
            {
                name: 'CAP: AnalyticalTable + GroupBy annotation is supported',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + makeCdsGroupByAnnotation('forAnalytical')
            },
            [
                {
                    filename: CAP_MANIFEST_PATH,
                    code: getManifestAsCode(CAP_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'AnalyticalTable' }])
                }
            ]
        ),
        createCapValidTest(
            {
                name: 'CAP: ResponsiveTable + GroupBy annotation is supported',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + makeCdsGroupByAnnotation('forResponsive')
            },
            [
                {
                    filename: CAP_MANIFEST_PATH,
                    code: getManifestAsCode(CAP_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'ResponsiveTable' }])
                }
            ]
        ),
        createCapValidTest(
            {
                name: 'CAP: no tableType set (default) + GroupBy annotation - not flagged',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + makeCdsGroupByAnnotation('forDefault')
            },
            []
        )
    ],

    invalid: [
        createCapInvalidTest(
            {
                name: 'CAP: GridTable + GroupBy in PresentationVariant annotation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + makeCdsGroupByAnnotation('forGrid'),
                errors: [{ message: ERROR_MESSAGE_GRID_TABLE }]
            },
            [
                {
                    filename: CAP_MANIFEST_PATH,
                    code: getManifestAsCode(CAP_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'GridTable' }])
                }
            ]
        ),
        createCapInvalidTest(
            {
                name: 'CAP: TreeTable + GroupBy in PresentationVariant annotation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + makeCdsGroupByAnnotation('forTree'),
                errors: [{ message: ERROR_MESSAGE_TREE_TABLE }]
            },
            [
                {
                    filename: CAP_MANIFEST_PATH,
                    code: getManifestAsCode(CAP_MANIFEST, [{ path: V4_TABLE_TYPE_PATH, value: 'TreeTable' }])
                }
            ]
        )
    ]
});
