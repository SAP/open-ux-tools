import { pathToFileURL } from 'node:url';
import { RuleTester } from 'eslint';
import noSingleFacetInCollectionRule from '../../src/rules/sap-no-single-facet-in-collection.js';
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
import { ProjectContext } from '../../src/project-context/project-context.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-no-single-facet-in-collection';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// V4: single CollectionFacet with exactly one ReferenceFacet child — VIOLATION
const V4_SINGLE_FACET_IN_COLLECTION = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="GeneralInfo"/>
                    <PropertyValue Property="Label" String="General Information"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V4: CollectionFacet with two ReferenceFacet children — VALID
const V4_TWO_FACETS_IN_COLLECTION = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="GeneralInfo"/>
                    <PropertyValue Property="Label" String="General Information"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                            </Record>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Address"/>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V4: direct ReferenceFacet (no CollectionFacet wrapper) — VALID
const V4_DIRECT_REFERENCE_FACET = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.ReferenceFacet">
                    <PropertyValue Property="ID" String="GeneralInfo"/>
                    <PropertyValue Property="Label" String="General Information"/>
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V4: two top-level CollectionFacets — first has one ReferenceFacet (first-level error),
// second has a nested CollectionFacet with one ReferenceFacet (nested error)
const V4_FIRST_LEVEL_AND_NESTED_SINGLE_FACET = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="FirstLevel"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#FirstLevel"/>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="Outer"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                            </Record>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="ID" String="Inner"/>
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
        </Annotation>
    </Annotations>`;

// V4: outer CollectionFacet with two children, inner CollectionFacet with one ReferenceFacet — VIOLATION on inner
const V4_NESTED_SINGLE_FACET_IN_COLLECTION = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="Outer"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                            </Record>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="ID" String="Inner"/>
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
        </Annotation>
    </Annotations>`;

// V4: CollectionFacet with empty Facets collection — VALID
const V4_EMPTY_COLLECTION_FACET = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="GeneralInfo"/>
                    <PropertyValue Property="Facets">
                        <Collection/>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V2: single CollectionFacet with exactly one ReferenceFacet child — VIOLATION
const V2_SINGLE_FACET_IN_COLLECTION = `
    <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="GeneralInfo"/>
                    <PropertyValue Property="Label" String="General Information"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.LineItem"/>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V2: CollectionFacet with two ReferenceFacets — VALID
const V2_TWO_FACETS_IN_COLLECTION = `
    <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
        <Annotation Term="UI.Facets">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="GeneralInfo"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.LineItem"/>
                            </Record>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V4: single CollectionFacet with exactly one ReferenceFacet child, qualified — VIOLATION
const V4_SINGLE_FACET_IN_COLLECTION_QUALIFIED = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.Facets" Qualifier="MyQualifier">
            <Collection>
                <Record Type="UI.CollectionFacet">
                    <PropertyValue Property="ID" String="GeneralInfo"/>
                    <PropertyValue Property="Label" String="General Information"/>
                    <PropertyValue Property="Facets">
                        <Collection>
                            <Record Type="UI.ReferenceFacet">
                                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

ruleTester.run(TEST_NAME, noSingleFacetInCollectionRule, {
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
                name: 'V4: CollectionFacet with two ReferenceFacets',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_TWO_FACETS_IN_COLLECTION)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: direct ReferenceFacet without CollectionFacet wrapper',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_DIRECT_REFERENCE_FACET)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: CollectionFacet with empty Facets collection',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_EMPTY_COLLECTION_FACET)
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
                name: 'V2: CollectionFacet with two ReferenceFacets',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_TWO_FACETS_IN_COLLECTION)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: violation pattern on entity with only a list report page is not flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_SINGLE_FACET_IN_COLLECTION)
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
                name: 'V4: CollectionFacet with single ReferenceFacet',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_SINGLE_FACET_IN_COLLECTION),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet must not contain only one UI.ReferenceFacet. Use UI.ReferenceFacet directly under UI.Facets instead.'
                    }
                ]
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: getManifestAsCode(V4_MANIFEST, []) // reset manifest content
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'V4: nested CollectionFacet with single ReferenceFacet',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_NESTED_SINGLE_FACET_IN_COLLECTION),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet must not contain only one UI.ReferenceFacet. Use UI.ReferenceFacet directly under UI.Facets instead.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: CollectionFacet with single ReferenceFacet',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_SINGLE_FACET_IN_COLLECTION),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet must not contain only one UI.ReferenceFacet. Use UI.ReferenceFacet directly under UI.Facets instead.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: first-level error and nested CollectionFacet error both reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FIRST_LEVEL_AND_NESTED_SINGLE_FACET),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet must not contain only one UI.ReferenceFacet. Use UI.ReferenceFacet directly under UI.Facets instead.'
                    },
                    {
                        message:
                            'UI.CollectionFacet must not contain only one UI.ReferenceFacet. Use UI.ReferenceFacet directly under UI.Facets instead.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: qualified UI.Facets with single ReferenceFacet in CollectionFacet',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_SINGLE_FACET_IN_COLLECTION_QUALIFIED),
                errors: [
                    {
                        message:
                            'UI.CollectionFacet must not contain only one UI.ReferenceFacet. Use UI.ReferenceFacet directly under UI.Facets instead.'
                    }
                ]
            },
            []
        )
    ]
});
