import type { Logger } from '@sap-ux/logger';
import type { ConvertedMetadata, EntityType, NavigationProperty } from '@sap-ux/vocabularies-types';
import type { Chart, PresentationVariant } from '@sap-ux/vocabularies-types/vocabularies/UI.js';

const UI_CHART_TERM = 'com.sap.vocabularies.UI.v1.Chart';
const UI_PRESENTATION_VARIANT_TERM = 'com.sap.vocabularies.UI.v1.PresentationVariant';

const UI_VOCABULARY_NAMESPACE = 'com.sap.vocabularies.UI.v1.';

// Mirrors the switch in `sap.fe.macros.MicroChart.createMicroChartId` — note the non-obvious
// mappings (Donut→Radial, Pie→HarveyBall, Bar→Comparison).
const CHART_TYPE_TO_MICROCHART_CLASS: Record<string, string> = {
    'UI.ChartType/Bullet': 'BulletMicroChart',
    'UI.ChartType/Donut': 'RadialMicroChart',
    'UI.ChartType/Pie': 'HarveyBallMicroChart',
    'UI.ChartType/BarStacked': 'StackedBarMicroChart',
    'UI.ChartType/Area': 'AreaMicroChart',
    'UI.ChartType/Column': 'ColumnMicroChart',
    'UI.ChartType/Bar': 'ComparisonMicroChart',
    'UI.ChartType/Line': 'LineMicroChart'
};

interface ParsedTarget {
    navPath: string;
    term: string;
    qualifier?: string;
}

/**
 * Splits a `Target` schema key value (e.g. `_NavProp/com.sap.vocabularies.UI.v1.Chart#Q`) into
 * navigation path, term suffix (without UI namespace) and qualifier.
 *
 * @param targetValue - the raw value of the section's `Target` schema key
 * @returns parsed components, or undefined if the value is not a recognised annotation path
 */
function parseAnnotationTarget(targetValue: string): ParsedTarget | undefined {
    if (!targetValue) {
        return undefined;
    }
    const lastSlash = targetValue.lastIndexOf('/');
    const navPath = lastSlash >= 0 ? targetValue.slice(0, lastSlash) : '';
    const remainder = lastSlash >= 0 ? targetValue.slice(lastSlash + 1) : targetValue;

    const hashIndex = remainder.indexOf('#');
    const fullTerm = hashIndex >= 0 ? remainder.slice(0, hashIndex) : remainder;
    const qualifier = hashIndex >= 0 ? remainder.slice(hashIndex + 1) : undefined;

    if (!fullTerm) {
        return undefined;
    }
    const term = fullTerm.startsWith(UI_VOCABULARY_NAMESPACE)
        ? fullTerm.slice(UI_VOCABULARY_NAMESPACE.length)
        : fullTerm;

    return { navPath, term, qualifier };
}

/**
 * Walks navigation properties along the given path starting at the page entity type.
 *
 * @param pageEntityType - entity type to start from
 * @param navPath - navigation path with `/` separators; can be empty
 * @returns the entity type at the end of the navigation chain, or undefined if a segment is missing
 */
function walkNavigationPath(pageEntityType: EntityType, navPath: string): EntityType | undefined {
    if (!navPath) {
        return pageEntityType;
    }
    let currentType: EntityType | undefined = pageEntityType;
    const segments = navPath.split('/').filter((segment) => segment.length > 0);
    for (const segment of segments) {
        const navProperty: NavigationProperty | undefined = currentType?.navigationProperties?.find(
            (property: NavigationProperty): boolean => property.name === segment
        );
        if (!navProperty) {
            return undefined;
        }
        currentType = navProperty.targetType;
    }
    return currentType;
}

/**
 * Looks up a UI annotation on the entity type by term suffix and optional qualifier.
 *
 * @param entityType - the entity type to search
 * @param term - term suffix without the `com.sap.vocabularies.UI.v1.` namespace
 * @param qualifier - optional qualifier
 * @returns the matching UI annotation, or undefined if not found
 */
function findUIAnnotation(entityType: EntityType, term: string, qualifier?: string): unknown {
    const uiAnnotations = entityType.annotations?.UI as Record<string, unknown> | undefined;
    if (!uiAnnotations) {
        return undefined;
    }
    const key = qualifier ? `${term}#${qualifier}` : term;
    return uiAnnotations[key];
}

/**
 * Follows `Visualizations[0]` of a `UI.PresentationVariant`, the same indirection the runtime
 * MicroChart macro performs.
 *
 * @param presentationVariant - the resolved PresentationVariant annotation
 * @returns the referenced Chart annotation, or undefined if the indirection cannot be followed
 */
function resolveChartFromPresentationVariant(presentationVariant: PresentationVariant): Chart | undefined {
    const firstVisualization = presentationVariant.Visualizations?.[0];
    const target = firstVisualization?.$target;
    if (target?.term === UI_CHART_TERM) {
        return target as Chart;
    }
    return undefined;
}

/**
 * Resolves the runtime MicroChart class name used as the `chartType` portion of the OPA5
 * control id, by looking up the section's annotation in the converted metadata and mapping
 * its `ChartType`.
 *
 * @param targetValue - the value of the section's `Target` schema key from the spec model
 * @param pageEntitySetName - the page entity set name from the page configuration
 * @param metadata - converted metadata of the main service (with merged annotations)
 * @param log - optional logger
 * @returns the runtime microchart class name, or undefined if it cannot be resolved
 */
export function resolveMicroChartType(
    targetValue: string | undefined,
    pageEntitySetName: string | undefined,
    metadata: ConvertedMetadata | undefined,
    log?: Logger
): string | undefined {
    if (!targetValue || !pageEntitySetName || !metadata) {
        return undefined;
    }
    try {
        const parsed = parseAnnotationTarget(targetValue);
        if (!parsed) {
            return undefined;
        }
        const pageEntitySet = metadata.entitySets.find((entitySet) => entitySet.name === pageEntitySetName);
        if (!pageEntitySet?.entityType) {
            return undefined;
        }
        const targetEntityType = walkNavigationPath(pageEntitySet.entityType, parsed.navPath);
        if (!targetEntityType) {
            return undefined;
        }
        const annotation = findUIAnnotation(targetEntityType, parsed.term, parsed.qualifier);
        if (!annotation) {
            return undefined;
        }

        let chart: Chart | undefined;
        const annotationTerm = (annotation as { term?: string }).term;
        if (annotationTerm === UI_CHART_TERM) {
            chart = annotation as Chart;
        } else if (annotationTerm === UI_PRESENTATION_VARIANT_TERM) {
            chart = resolveChartFromPresentationVariant(annotation as PresentationVariant);
        }

        if (!chart) {
            return undefined;
        }

        const chartType = chart.ChartType?.toString();
        if (!chartType) {
            return undefined;
        }
        return CHART_TYPE_TO_MICROCHART_CLASS[chartType];
    } catch (error) {
        log?.debug(`Failed to resolve microchart type for target '${targetValue}': ${(error as Error).message}`);
        return undefined;
    }
}
