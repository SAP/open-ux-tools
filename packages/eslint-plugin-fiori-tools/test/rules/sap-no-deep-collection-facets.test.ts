import { RuleTester } from 'eslint';
import noDeepCollectionFacetsRule from '../../src/rules/sap-no-deep-collection-facets.js';
import { meta, languages } from '../../src/index.js';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_MANIFEST,
    V4_MANIFEST_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-no-deep-collection-facets';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// V4: two-level nesting (valid - second level is allowed)
const V4_TWO_LEVEL_NESTING = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="Level1"/>
                    <PropertyValue Property="Label" String="Level 1"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="ID" String="Level2"/>
                                <PropertyValue Property="Label" String="Level 2"/>
                                <PropertyValue Property="Facets">
                                    <Collection>
                                        <Record Type="UI.ReferenceFacet">
                                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                                        </Record>
                                    </Collection>
                                </PropertyValue>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V4: three-level nesting (violation - third level CollectionFacet)
const V4_THREE_LEVEL_NESTING = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="Level1"/>
                    <PropertyValue Property="Label" String="Level 1"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="ID" String="Level2"/>
                                <PropertyValue Property="Label" String="Level 2"/>
                                <PropertyValue Property="Facets">
                                    <Collection>
                                        <Record Type="UI.CollectionFacet">
                                            <PropertyValue Property="ID" String="Level3"/>
                                            <PropertyValue Property="Label" String="Level 3 - VIOLATION"/>
                                            <PropertyValue Property="Facets">
                                                <Collection>
                                                    <Record Type="UI.ReferenceFacet">
                                                        <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                                                    </Record>
                                                </Collection>
                                            </PropertyValue>
                                        </Record>
                                    </Collection>
                                </PropertyValue>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V4: four-level nesting (multiple violations)
const V4_FOUR_LEVEL_NESTING = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="Level1"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="ID" String="Level2"/>
                                <PropertyValue Property="Facets">
                                    <Collection>
                                        <Record Type="UI.CollectionFacet">
                                            <PropertyValue Property="ID" String="Level3"/>
                                            <PropertyValue Property="Facets">
                                                <Collection>
                                                    <Record Type="UI.CollectionFacet">
                                                        <PropertyValue Property="ID" String="Level4"/>
                                                        <PropertyValue Property="Facets">
                                                            <Collection>
                                                                <Record Type="UI.ReferenceFacet">
                                                                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                                                                </Record>
                                                            </Collection>
                                                        </PropertyValue>
                                                    </Record>
                                                </Collection>
                                            </PropertyValue>
                                        </Record>
                                    </Collection>
                                </PropertyValue>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V4: single-level facets (valid)
const V4_SINGLE_LEVEL_FACETS = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.ReferenceFacet">
                    <PropertyValue Property="ID" String="Details"/>
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                </Record>
                <Record Type="UI.ReferenceFacet">
                    <PropertyValue Property="ID" String="Address"/>
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Address"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V4: mixed structure with third-level violation
const V4_MIXED_STRUCTURE = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.ReferenceFacet">
                    <PropertyValue Property="ID" String="SimpleReference"/>
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Simple"/>
                </Record>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="Level1"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="Level1WithNesting"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="ID" String="Level2"/>
                                <PropertyValue Property="Facets">
                                    <Collection>
                                        <Record Type="UI.CollectionFacet">
                                            <PropertyValue Property="ID" String="Level3Violation"/>
                                            <PropertyValue Property="Facets">
                                                <Collection>
                                                    <Record Type="UI.ReferenceFacet">
                                                        <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Address"/>
                                                    </Record>
                                                </Collection>
                                            </PropertyValue>
                                        </Record>
                                    </Collection>
                                </PropertyValue>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V2: three-level nesting (violation)
const V2_THREE_LEVEL_NESTING = `
    <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="Level1"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="ID" String="Level2"/>
                                <PropertyValue Property="Facets">
                                    <Collection>
                                        <Record Type="UI.CollectionFacet">
                                            <PropertyValue Property="ID" String="Level3"/>
                                            <PropertyValue Property="Facets">
                                                <Collection>
                                                    <Record Type="UI.ReferenceFacet">
                                                        <PropertyValue Property="Target" AnnotationPath="@UI.LineItem"/>
                                                    </Record>
                                                </Collection>
                                            </PropertyValue>
                                        </Record>
                                    </Collection>
                                </PropertyValue>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V4: qualified annotation with three-level nesting (violation)
const V4_QUALIFIED_THREE_LEVEL = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets" Qualifier="MyQualifier">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="Level1"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="ID" String="Level2"/>
                                <PropertyValue Property="Facets">
                                    <Collection>
                                        <Record Type="UI.CollectionFacet">
                                            <PropertyValue Property="ID" String="Level3"/>
                                            <PropertyValue Property="Facets">
                                                <Collection>
                                                    <Record Type="UI.ReferenceFacet">
                                                        <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                                                    </Record>
                                                </Collection>
                                            </PropertyValue>
                                        </Record>
                                    </Collection>
                                </PropertyValue>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

ruleTester.run(TEST_NAME, noDeepCollectionFacetsRule, {
    valid: [
        createValidTest(
            {
                name: 'V4: no UI.Facets annotation',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: single-level ReferenceFacets only',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_SINGLE_LEVEL_FACETS)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: two-level nesting (second level allowed)',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_TWO_LEVEL_NESTING)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: no UI.Facets annotation',
                filename: V2_ANNOTATIONS_PATH,
                code: V2_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: violation pattern on entity with only a list report page is not flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_THREE_LEVEL_NESTING)
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [
                        { path: ['sap.ui5', 'routing', 'targets', 'IncidentsObjectPage'], value: undefined }
                    ])
                }
            ]
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'V4: three-level CollectionFacet nesting',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_THREE_LEVEL_NESTING),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet at third level or deeper is not considered by SAP Fiori elements. Reorganize your facet structure to use a maximum of two levels.'
                    }
                ]
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [])
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V4: four-level nesting (reports level 3 and level 4)',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FOUR_LEVEL_NESTING),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet at third level or deeper is not considered by SAP Fiori elements. Reorganize your facet structure to use a maximum of two levels.'
                    },
                    {
                        message:
                            'UI.CollectionFacet at third level or deeper is not considered by SAP Fiori elements. Reorganize your facet structure to use a maximum of two levels.'
                    }
                ]
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [])
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V4: mixed structure with one third-level violation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MIXED_STRUCTURE),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet at third level or deeper is not considered by SAP Fiori elements. Reorganize your facet structure to use a maximum of two levels.'
                    }
                ]
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [])
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V2: three-level CollectionFacet nesting',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_THREE_LEVEL_NESTING),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet at third level or deeper is not considered by SAP Fiori elements. Reorganize your facet structure to use a maximum of two levels.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: qualified annotation with three-level nesting',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_QUALIFIED_THREE_LEVEL),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet at third level or deeper is not considered by SAP Fiori elements. Reorganize your facet structure to use a maximum of two levels.'
                    }
                ]
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, [])
                }
            ]
        )
    ]
});
