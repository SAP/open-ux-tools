import { RuleTester } from 'eslint';
import noCommasInSectionTitlesRule from '../../src/rules/sap-no-commas-in-section-titles';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    setup,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

// ── V4 annotation snippets ────────────────────────────────────────────────────

const V4_FACETS_NO_COMMA = `
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="GeneralData"/>
                <PropertyValue Property="Label" String="General Data"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneralData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>`;

const V4_FACETS_WITH_COMMA = `
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="GeneralData"/>
                <PropertyValue Property="Label" String="General Data, Overview"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneralData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>`;

const V4_HEADER_FACETS_WITH_COMMA = `
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.HeaderFacets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="Header"/>
                <PropertyValue Property="Label" String="Header, Info"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Header"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>`;

const V4_COLLECTION_FACET_SUBSECTION_WITH_COMMA = `
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="ID" String="Section1"/>
                <PropertyValue Property="Label" String="Section One"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="Subsection1"/>
                            <PropertyValue Property="Label" String="Subsection, One"/>
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#SubData"/>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </Annotation>
</Annotations>`;

const V4_COLLECTION_FACET_WITH_COMMA = `
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="ID" String="Section1"/>
                <PropertyValue Property="Label" String="Section, One"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="Subsection1"/>
                            <PropertyValue Property="Label" String="Subsection One"/>
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#SubData"/>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </Annotation>
</Annotations>`;

const V4_FACETS_NO_LABEL = `
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="GeneralData"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneralData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>`;

// ── V2 annotation snippets ────────────────────────────────────────────────────

const V2_FACETS_NO_COMMA = `
<Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="SalesData"/>
                <PropertyValue Property="Label" String="Sales Data"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#SalesData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>`;

const V2_FACETS_WITH_COMMA = `
<Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="SalesData"/>
                <PropertyValue Property="Label" String="Sales Data, Summary"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#SalesData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>`;

// ─────────────────────────────────────────────────────────────────────────────

const TEST_NAME = 'sap-no-commas-in-section-titles';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, noCommasInSectionTitlesRule, {
    valid: [
        createValidTest(
            {
                name: 'non XML file - json',
                filename: 'some-other-file.json',
                code: '{}'
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: facets with labels that have no commas',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_NO_COMMA)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: facets record without label property',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_NO_LABEL)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: facets with labels that have no commas',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_FACETS_NO_COMMA)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: annotation file with no facets at all',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4: ReferenceFacet label with comma',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_WITH_COMMA),
                errors: [
                    {
                        message:
                            'Section title "General Data, Overview" must not contain commas. Commas are used as delimiters for grouping backend messages and their presence in facet labels will break message grouping at runtime.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: HeaderFacets label with comma',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_HEADER_FACETS_WITH_COMMA),
                errors: [
                    {
                        message:
                            'Section title "Header, Info" must not contain commas. Commas are used as delimiters for grouping backend messages and their presence in facet labels will break message grouping at runtime.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: CollectionFacet subsection label with comma',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_COLLECTION_FACET_SUBSECTION_WITH_COMMA),
                errors: [
                    {
                        message:
                            'Section title "Subsection, One" must not contain commas. Commas are used as delimiters for grouping backend messages and their presence in facet labels will break message grouping at runtime.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: CollectionFacet section label with comma',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_COLLECTION_FACET_WITH_COMMA),
                errors: [
                    {
                        message:
                            'Section title "Section, One" must not contain commas. Commas are used as delimiters for grouping backend messages and their presence in facet labels will break message grouping at runtime.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: ReferenceFacet label with comma',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_FACETS_WITH_COMMA),
                errors: [
                    {
                        message:
                            'Section title "Sales Data, Summary" must not contain commas. Commas are used as delimiters for grouping backend messages and their presence in facet labels will break message grouping at runtime.'
                    }
                ]
            },
            []
        )
    ]
});
