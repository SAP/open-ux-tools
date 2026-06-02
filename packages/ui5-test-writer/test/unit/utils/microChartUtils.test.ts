import type { Logger } from '@sap-ux/logger';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { resolveMicroChartType } from '../../../src/utils/microChartUtils';

const PRESENTATION_VARIANT_TERM = 'com.sap.vocabularies.UI.v1.PresentationVariant';
const CHART_TERM = 'com.sap.vocabularies.UI.v1.Chart';

/**
 * Builds a minimal `ConvertedMetadata` stub from a compact spec.
 *
 * @param spec - description of entity sets and the UI annotations attached to their entity types
 * @param spec.entitySets - entity sets directly reachable from the page
 * @param spec.entityTypeMap - lookup of entity types referenced via navigation properties
 * @returns a minimal ConvertedMetadata stub for the test
 */
function buildMetadata(spec: {
    entitySets: {
        name: string;
        entityType: {
            navigationProperties?: { name: string; targetTypeName: string }[];
            uiAnnotations?: Record<string, unknown>;
        };
    }[];
    entityTypeMap?: Record<string, { uiAnnotations?: Record<string, unknown> }>;
}): ConvertedMetadata {
    // Resolve targetType references inside navigationProperties from entityTypeMap
    const entitySets = spec.entitySets.map((es) => {
        const navProps = (es.entityType.navigationProperties ?? []).map((np) => ({
            name: np.name,
            targetType: {
                annotations: { UI: spec.entityTypeMap?.[np.targetTypeName]?.uiAnnotations ?? {} },
                navigationProperties: []
            }
        }));
        return {
            name: es.name,
            entityType: {
                annotations: { UI: es.entityType.uiAnnotations ?? {} },
                navigationProperties: navProps
            }
        };
    });
    return { entitySets } as unknown as ConvertedMetadata;
}

describe('resolveMicroChartType()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    test('returns undefined when target value is missing', () => {
        const metadata = buildMetadata({ entitySets: [] });
        expect(resolveMicroChartType(undefined, 'X', metadata)).toBeUndefined();
    });

    test('returns undefined when entity set name is missing', () => {
        const metadata = buildMetadata({ entitySets: [] });
        expect(resolveMicroChartType('com.sap.vocabularies.UI.v1.Chart#X', undefined, metadata)).toBeUndefined();
    });

    test('returns undefined when metadata is undefined', () => {
        expect(resolveMicroChartType('com.sap.vocabularies.UI.v1.Chart#X', 'TestSet', undefined)).toBeUndefined();
    });

    test('returns undefined when entity set is not found in metadata', () => {
        const metadata = buildMetadata({ entitySets: [] });
        expect(
            resolveMicroChartType('com.sap.vocabularies.UI.v1.Chart#X', 'Missing', metadata, mockLogger)
        ).toBeUndefined();
    });

    test('resolves a direct UI.Chart annotation to its mapped microchart class', () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: {
                            'Chart#Revenue': { term: CHART_TERM, ChartType: 'UI.ChartType/Line' }
                        }
                    }
                }
            ]
        });
        const result = resolveMicroChartType('com.sap.vocabularies.UI.v1.Chart#Revenue', 'TestSet', metadata);
        expect(result).toBe('LineMicroChart');
    });

    test('maps each known UI.ChartType enum to the runtime class name', () => {
        const cases: { chartType: string; expected: string }[] = [
            { chartType: 'UI.ChartType/Bullet', expected: 'BulletMicroChart' },
            { chartType: 'UI.ChartType/Donut', expected: 'RadialMicroChart' },
            { chartType: 'UI.ChartType/Pie', expected: 'HarveyBallMicroChart' },
            { chartType: 'UI.ChartType/BarStacked', expected: 'StackedBarMicroChart' },
            { chartType: 'UI.ChartType/Area', expected: 'AreaMicroChart' },
            { chartType: 'UI.ChartType/Column', expected: 'ColumnMicroChart' },
            { chartType: 'UI.ChartType/Bar', expected: 'ComparisonMicroChart' },
            { chartType: 'UI.ChartType/Line', expected: 'LineMicroChart' }
        ];
        cases.forEach(({ chartType, expected }) => {
            const metadata = buildMetadata({
                entitySets: [
                    {
                        name: 'TestSet',
                        entityType: {
                            uiAnnotations: {
                                'Chart#Q': { term: CHART_TERM, ChartType: chartType }
                            }
                        }
                    }
                ]
            });
            expect(resolveMicroChartType('com.sap.vocabularies.UI.v1.Chart#Q', 'TestSet', metadata)).toBe(expected);
        });
    });

    test('returns undefined when the chart type is not in the supported mapping', () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: {
                            'Chart#Q': { term: CHART_TERM, ChartType: 'UI.ChartType/Combination' }
                        }
                    }
                }
            ]
        });
        expect(resolveMicroChartType('com.sap.vocabularies.UI.v1.Chart#Q', 'TestSet', metadata)).toBeUndefined();
    });

    test('returns undefined when the annotation is missing', () => {
        const metadata = buildMetadata({
            entitySets: [{ name: 'TestSet', entityType: { uiAnnotations: {} } }]
        });
        expect(resolveMicroChartType('com.sap.vocabularies.UI.v1.Chart#Missing', 'TestSet', metadata)).toBeUndefined();
    });

    test('walks navigation properties to resolve a chart on a related entity type', () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        navigationProperties: [{ name: '_NavProp', targetTypeName: 'TargetEntity' }]
                    }
                }
            ],
            entityTypeMap: {
                TargetEntity: {
                    uiAnnotations: {
                        'Chart#Q': { term: CHART_TERM, ChartType: 'UI.ChartType/Column' }
                    }
                }
            }
        });
        const result = resolveMicroChartType('_NavProp/com.sap.vocabularies.UI.v1.Chart#Q', 'TestSet', metadata);
        expect(result).toBe('ColumnMicroChart');
    });

    test('follows PresentationVariant.Visualizations[0] to resolve the chart type', () => {
        const chartAnnotation = { term: CHART_TERM, ChartType: 'UI.ChartType/Bullet' };
        const presentationVariant = {
            term: PRESENTATION_VARIANT_TERM,
            Visualizations: [{ $target: chartAnnotation }]
        };
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: { 'PresentationVariant#PV': presentationVariant }
                    }
                }
            ]
        });
        const result = resolveMicroChartType('com.sap.vocabularies.UI.v1.PresentationVariant#PV', 'TestSet', metadata);
        expect(result).toBe('BulletMicroChart');
    });

    test('returns undefined when PresentationVariant has no Visualizations', () => {
        const presentationVariant = { term: PRESENTATION_VARIANT_TERM, Visualizations: [] };
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: { 'PresentationVariant#PV': presentationVariant }
                    }
                }
            ]
        });
        expect(
            resolveMicroChartType('com.sap.vocabularies.UI.v1.PresentationVariant#PV', 'TestSet', metadata)
        ).toBeUndefined();
    });

    test('returns undefined when nav property cannot be resolved', () => {
        const metadata = buildMetadata({
            entitySets: [{ name: 'TestSet', entityType: {} }]
        });
        expect(
            resolveMicroChartType('_Missing/com.sap.vocabularies.UI.v1.Chart#Q', 'TestSet', metadata)
        ).toBeUndefined();
    });
});
