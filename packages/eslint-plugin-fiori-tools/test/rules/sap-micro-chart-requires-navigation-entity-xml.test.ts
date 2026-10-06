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
const EXPECTED_MEASURE_MESSAGE = 'Micro chart measure must reference a property from a 1:n navigation entity.';
const EXPECTED_DIMENSION_MESSAGE = 'Micro chart dimension must reference a property from a 1:n navigation entity.';
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

const V4_MICRO_CHART_DATAPOINT_ONLY_MEASURES = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart#BulletChart"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart" Qualifier="BulletChart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bullet"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>status</PropertyPath>
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

// Chart on IncidentFlow, referenced via the 1:n incidentFlow navigation from Incidents.
// Because incidentFlow is collection-valued, the chart entity is already a collection row —
// its direct scalar properties are valid measures/dimensions.
const V4_MICRO_CHART_CROSS_ENTITY_1N_VALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="incidentFlow/@UI.Chart#FlowChart"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>
    <Annotations Target="IncidentService.IncidentFlow">
        <Annotation Term="UI.Chart" Qualifier="FlowChart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bar"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>processStep</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>stepStatus</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

// Chart referenced via the to-one processingThreshold navigation from Incidents.
// Because processingThreshold is NOT collection-valued, the chart entity is still in a single-row
// context — but Bar is not in the 1:n-required set, so the rule does not fire.
const V4_MICRO_CHART_CROSS_ENTITY_TO_ONE_VALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="processingThreshold/@UI.Chart#ThresholdChart"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>
    <Annotations Target="IncidentService.ProcessingThreshold">
        <Annotation Term="UI.Chart" Qualifier="ThresholdChart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bar"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>processingDays</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>processingLimit</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

// Bullet chart (1:1 navigation type) with direct properties — excluded from 1:n rule.
// V4_MICRO_CHART_DATAPOINT_ONLY_MEASURES already covers Bullet; kept for documentation.

// Harvey Ball micro chart uses ChartType/Pie — excluded from 1:n rule.
const V4_MICRO_CHART_HARVEY_BALL = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart#HarveyBall"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart" Qualifier="HarveyBall">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Pie"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>status</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

// Radial micro chart uses ChartType/Donut — excluded from 1:n rule.
const V4_MICRO_CHART_RADIAL = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart#Radial"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart" Qualifier="Radial">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Donut"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>status</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

// Chart with no ChartType defined — skipped entirely.
const V4_MICRO_CHART_NO_CHART_TYPE = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart#NoType"/>
                </Record>
            </Collection>
        </Annotation>
        <Annotation Term="UI.Chart" Qualifier="NoType">
            <Record>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>status</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
    </Annotations>`;

// Chart on ProcessingThreshold (to-one nav) with a 1:n-required type — rule fires.
const V4_MICRO_CHART_CROSS_ENTITY_TO_ONE_INVALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="processingThreshold/@UI.Chart#ThresholdChart"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>
    <Annotations Target="IncidentService.ProcessingThreshold">
        <Annotation Term="UI.Chart" Qualifier="ThresholdChart">
            <Record>
                <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Line"/>
                <PropertyValue Property="Measures">
                    <Collection>
                        <PropertyPath>processingDays</PropertyPath>
                    </Collection>
                </PropertyValue>
                <PropertyValue Property="Dimensions">
                    <Collection>
                        <PropertyPath>processingLimit</PropertyPath>
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
        ),
        createValidTest(
            {
                // Chart referenced via 1:n incidentFlow navigation. The chart entity (IncidentFlow) is
                // a collection row, so its direct scalar properties are valid measures/dimensions.
                name: 'V4: chart on 1:n cross-entity with direct properties - not reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_CROSS_ENTITY_1N_VALID)
            },
            []
        ),
        createValidTest(
            {
                // Bar is not in the 1:n-required set (Line/Area/Column/StackedBar/Comparison), so no check.
                name: 'V4: Bar chart (non-micro-chart type) - not reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_NON_MICRO_CHART)
            },
            []
        ),
        createValidTest(
            {
                // Bullet uses 1:1 navigation; excluded from the 1:n rule.
                name: 'V4: Bullet chart with direct Measures - not reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_DATAPOINT_ONLY_MEASURES)
            },
            []
        ),
        createValidTest(
            {
                // Harvey Ball (Pie) uses 1:1 navigation; excluded from the 1:n rule.
                name: 'V4: Harvey Ball (Pie) chart with direct Measures - not reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_HARVEY_BALL)
            },
            []
        ),
        createValidTest(
            {
                // Radial (Donut) uses 1:1 navigation; excluded from the 1:n rule.
                name: 'V4: Radial (Donut) chart with direct Measures - not reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_RADIAL)
            },
            []
        ),
        createValidTest(
            {
                // No ChartType defined — rule is skipped entirely.
                name: 'V4: chart with no ChartType - not reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_NO_CHART_TYPE)
            },
            []
        ),
        createValidTest(
            {
                // Bar chart on to-one cross-entity: Bar is not in the 1:n-required set, so no check.
                name: 'V4: Bar chart on to-one cross-entity with direct properties - not reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_CROSS_ENTITY_TO_ONE_VALID)
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
                errors: [{ message: EXPECTED_DIMENSION_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: micro chart with Measures without navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_MEASURES_INVALID),
                errors: [{ message: EXPECTED_MEASURE_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: micro chart with both Measures and Dimensions without navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_BOTH_INVALID),
                errors: [{ message: EXPECTED_MEASURE_MESSAGE }, { message: EXPECTED_DIMENSION_MESSAGE }]
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
                errors: [{ message: EXPECTED_MEASURE_MESSAGE }, { message: EXPECTED_DIMENSION_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: chart with only Measures and no Dimensions without navigation - reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_QUALIFIED_INVALID),
                errors: [{ message: EXPECTED_MEASURE_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                // Line chart on to-one cross-entity: Line IS in the 1:n-required set, rule fires.
                name: 'V4: Line chart on to-one cross-entity with direct properties - reported',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_MICRO_CHART_CROSS_ENTITY_TO_ONE_INVALID),
                errors: [{ message: EXPECTED_MEASURE_MESSAGE }, { message: EXPECTED_DIMENSION_MESSAGE }]
            },
            []
        )
    ]
});
