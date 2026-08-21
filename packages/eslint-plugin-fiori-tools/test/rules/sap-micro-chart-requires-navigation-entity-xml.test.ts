import { RuleTester } from 'eslint';
import microChartRule from '../../src/rules/sap-micro-chart-requires-navigation-entity.js';
import { meta, languages } from '../../src/index.js';
import {
    getAnnotationsAsXmlCode,
    setup,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-micro-chart-requires-navigation-entity';
const EXPECTED_MESSAGE = 'Micro chart measures and dimensions must reference properties from a 1:n navigation entity.';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// V4 entity: IncidentService.Incidents (incidentFlow is a 1:n navigation to IncidentFlow)
// V2 entity: TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType
// V4: UI.LineItem with DataFieldForAnnotation makes charts page-visible (LR table column)
// V2: UI.HeaderFacets + UI.FieldGroup + DataFieldForAnnotation makes charts page-visible (OP header field group)

const V4_NON_MICRO_CHART = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bar"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>status</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>category_code</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

const V4_MICRO_CHART_VALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart#RevenueTrend"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart" Qualifier="RevenueTrend">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Line"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>incidentFlow/criticality</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>incidentFlow/id</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

const V4_MICRO_CHART_QUALIFIED_VALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart#ColumnTrend"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart" Qualifier="ColumnTrend">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Column"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>incidentFlow/criticality</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

const V4_MICRO_CHART_MEASURES_INVALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Line"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>status</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>incidentFlow/id</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

const V4_MICRO_CHART_DIMENSIONS_INVALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Area"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>incidentFlow/criticality</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>category_code</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

const V4_MICRO_CHART_BOTH_INVALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/StackedBar"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>status</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>category_code</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

const V4_MICRO_CHART_QUALIFIED_INVALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart#BadChart"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart" Qualifier="BadChart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Comparison"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>title</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

// V2: chart referenced via UI.HeaderFacets → UI.FieldGroup (OP header field group)
// The ReferenceFacet must include ID so processReferenceFacetRecord can link it.
const V2_MICRO_CHART_VALID = `
    <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
        <Annotation Term="UI.HeaderFacets">
            <Collection>
                <Record Type="UI.ReferenceFacet">
                    <PropertyValue Property="ID" String="ChartHeader"/>
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#ChartFG"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.FieldGroup" Qualifier="ChartFG">
            <Record>
                <PropertyValue Property="Data">
                    <Collection>
                        <Record Type="UI.DataFieldForAnnotation">
                            <PropertyValue Property="Target" AnnotationPath="@UI.Chart"/>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
        <Annotation Term="UI.Chart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Column"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>to_Items/GrossAmount</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>to_Items/Currency</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

const V2_MICRO_CHART_INVALID = `
    <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
        <Annotation Term="UI.HeaderFacets">
            <Collection>
                <Record Type="UI.ReferenceFacet">
                    <PropertyValue Property="ID" String="ChartHeader"/>
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#ChartFG"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.FieldGroup" Qualifier="ChartFG">
            <Record>
                <PropertyValue Property="Data">
                    <Collection>
                        <Record Type="UI.DataFieldForAnnotation">
                            <PropertyValue Property="Target" AnnotationPath="@UI.Chart"/>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
        <Annotation Term="UI.Chart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Area"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>GrossAmount</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>DeliveryCalendarYear</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

ruleTester.run(TEST_NAME, microChartRule, {
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
                name: 'V4: no chart annotations',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: micro chart with all navigation paths',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_VALID)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: qualified micro chart with navigation paths',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_QUALIFIED_VALID)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: micro chart with all navigation paths',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_MICRO_CHART_VALID)
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'V4: micro chart with Dimensions without navigation - reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_DIMENSIONS_INVALID),
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: Bar chart with direct Measures - reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_NON_MICRO_CHART),
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: micro chart with Measures without navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_MEASURES_INVALID),
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: micro chart with both Measures and Dimensions without navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_BOTH_INVALID),
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: qualified micro chart with Measures without navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_QUALIFIED_INVALID),
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                // Chart is referenced from OP header field group via UI.HeaderFacets → UI.FieldGroup.
                // Only the injected chart (GrossAmount, no navigation) is checked.
                name: 'V2: micro chart with direct properties',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_MICRO_CHART_INVALID),
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            []
        )
    ]
});
