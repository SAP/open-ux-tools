import { RuleTester } from 'eslint';
import microChartRule from '../../src/rules/sap-micro-chart-requires-navigation-entity.js';
import { meta, languages } from '../../src/index.js';
import { setup, CAP_ANNOTATIONS, CAP_ANNOTATIONS_PATH, CAP_APP_PATH } from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-micro-chart-requires-navigation-entity - CDS';
const EXPECTED_MEASURE_MESSAGE = 'Micro chart measure must reference a property from a 1:n navigation entity.';
const EXPECTED_DIMENSION_MESSAGE = 'Micro chart dimension must reference a property from a 1:n navigation entity.';
const { createValidTest, createInvalidTest } = setup(TEST_NAME, CAP_APP_PATH);

// CDS: service.Incidents entity; incidentFlow is a 1:n navigation to IncidentFlow
// UI.LineItem with DataFieldForAnnotation makes the chart page-visible (overwrites base UI.LineItem via CDS last-wins).

const CDS_MICRO_CHART_VALID = `
annotate service.Incidents with @(
    UI.LineItem: [{$Type: 'UI.DataFieldForAnnotation', Target: '@UI.Chart#CdsTrend'}],
    UI.Chart #CdsTrend: {
        ChartType: #Line,
        Measures: [incidentFlow/criticality],
        Dimensions: [incidentFlow/id]
    }
);`;

const CDS_NON_MICRO_CHART = `
annotate service.Incidents with @(
    UI.LineItem: [{$Type: 'UI.DataFieldForAnnotation', Target: '@UI.Chart#CdsBar'}],
    UI.Chart #CdsBar: {
        ChartType: #Bar,
        Measures: [status],
        Dimensions: [category_code]
    }
);`;

const CDS_MICRO_CHART_INVALID = `
annotate service.Incidents with @(
    UI.LineItem: [{$Type: 'UI.DataFieldForAnnotation', Target: '@UI.Chart#CdsBad'}],
    UI.Chart #CdsBad: {
        ChartType: #Column,
        Measures: [status],
        Dimensions: [incidentFlow/id]
    }
);`;

const CDS_MICRO_CHART_DIMENSIONS_INVALID = `
annotate service.Incidents with @(
    UI.LineItem: [{$Type: 'UI.DataFieldForAnnotation', Target: '@UI.Chart#CdsDimBad'}],
    UI.Chart #CdsDimBad: {
        ChartType: #Area,
        Measures: [incidentFlow/criticality],
        Dimensions: [category_code]
    }
);`;

// Line chart defined on IncidentFlow and referenced via the 1:n incidentFlow navigation.
// The chart entity is already a collection row, so direct scalar properties are valid.
const CDS_MICRO_CHART_CROSS_ENTITY_1N_LINE_VALID = `
annotate service.Incidents with @(
    UI.LineItem: [{$Type: 'UI.DataFieldForAnnotation', Target: 'incidentFlow/@UI.Chart#CdsFlowLine'}]
);

annotate service.IncidentFlow with @(
    UI.Chart #CdsFlowLine: {
        ChartType: #Line,
        Measures: [criticality],
        Dimensions: [id]
    }
);`;

ruleTester.run(TEST_NAME, microChartRule, {
    valid: [
        createValidTest(
            {
                name: 'non CDS file - json',
                filename: 'some-other-file.json',
                code: '{}'
            },
            []
        ),
        createValidTest(
            {
                name: 'CDS: no chart annotations',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'CDS: micro chart with navigation paths',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_MICRO_CHART_VALID
            },
            []
        ),
        createValidTest(
            {
                // Bar is not in the 1:n-required set (Line/Area/Column/StackedBar/Comparison), so no check.
                name: 'CDS: Bar chart (non-micro-chart type) - not reported',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_NON_MICRO_CHART
            },
            []
        ),
        createValidTest(
            {
                // Line is in the 1:n-required set, but the chart entity (IncidentFlow) is reached via
                // 1:n navigation (incidentFlow) so it is already a collection row — direct scalar
                // properties are valid measures/dimensions without further navigation.
                name: 'CDS: Line chart on 1:n cross-entity (IncidentFlow) with direct properties - not reported',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_MICRO_CHART_CROSS_ENTITY_1N_LINE_VALID
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'CDS: micro chart Measures without navigation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_MICRO_CHART_INVALID,
                errors: [{ message: EXPECTED_MEASURE_MESSAGE }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'CDS: micro chart Dimensions without navigation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_MICRO_CHART_DIMENSIONS_INVALID,
                errors: [{ message: EXPECTED_DIMENSION_MESSAGE }]
            },
            []
        )
    ]
});
