import type { Element, MetadataElement } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { MicroChartRequiresNavigationEntity } from '../language/diagnostics.js';
import { MICRO_CHART_REQUIRES_NAVIGATION_ENTITY } from '../language/diagnostics.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';
import type { IndexedAnnotation, ParsedService } from '../project-context/parser/index.js';
import {
    getElementText,
    getEntityTypeForContextPath,
    getPropertyValueElement
} from '../project-context/linker/annotations.js';

/** Annotation record properties whose `PropertyPath` values must use a 1:n navigation path. */
const MICRO_CHART_CHECKED_PROPS = ['Measures', 'Dimensions'] as const;

/**
 * Returns `true` when `pathValue` violates the 1:n navigation requirement.
 *
 * Traverses each segment of the path against the entity type index (keyed by fully-qualified
 * name matching `annotation.target`).  At each step:
 * - If the segment is a collection-valued (1:n) navigation → valid, return `false`.
 * - If the segment is a 1:1 navigation entity type → follow `structuredType` to next entity.
 * - If the segment is a scalar property with no prior 1:n hop → violation, return `true`.
 *
 * When a segment cannot be resolved (incomplete fixtures, unknown entity), falls back to
 * requiring a `/` separator as a best-effort heuristic.
 *
 * @param pathValue - The property path string to validate.
 * @param chartEntityType - The fully-qualified entity type name of the chart's annotation target.
 * @param service - The parsed OData service.
 * @returns `true` when the path violates the 1:n navigation requirement, `false` when valid.
 */
function violatesNavigationRule(
    pathValue: string,
    chartEntityType: string,
    service: ParsedService | undefined
): boolean {
    if (!pathValue) {
        return false;
    }
    if (service) {
        let currentEntityType = chartEntityType;
        for (const segment of pathValue.split('/')) {
            const navElement = getEntityTypeForContextPath(`/${currentEntityType}/${segment}`, service);
            if (!navElement) {
                break; // Segment unresolvable — fall through to heuristic.
            }
            if (navElement.isCollectionValued) {
                return false; // Confirmed 1:n navigation — valid.
            }
            if (navElement.isEntityType && navElement.structuredType) {
                // Confirmed 1:1 navigation hop — traverse into its entity type.
                currentEntityType = navElement.structuredType;
                continue;
            }
            // Element found but not classified as navigation (e.g. CDS association without flags set,
            // or scalar property). Fall through to heuristic to avoid false positives.
            break;
        }
    }
    // Metadata unavailable or segment not resolved — require a navigation separator as best-effort.
    return !pathValue.includes('/');
}

/**
 * Inspects a single `UI.Chart` annotation and appends a diagnostic for each `Measures`
 * or `Dimensions` `PropertyPath` that does not traverse a 1:n navigation property.
 *
 * Each diagnostic points at the specific violating `PropertyPath` element and carries whether
 * the violation is in a measure or a dimension.
 *
 * @param annotation - The full indexed annotation, used for both the element and its target entity type.
 * @param pageNames - Names of pages that reference this chart annotation.
 * @param chartEntityType - The entity type name of the chart's context.
 * @param service - The parsed OData service providing the metadata for multiplicity checks.
 * @param problems - Accumulator array to which new diagnostics are pushed.
 */
function checkChartAnnotation(
    annotation: IndexedAnnotation,
    pageNames: string[],
    chartEntityType: string,
    service: ParsedService | undefined,
    problems: MicroChartRequiresNavigationEntity[]
): void {
    const annotationElement = annotation.top.value;
    const [record] = elementsWithName(Edm.Record, annotationElement);
    if (!record) {
        return;
    }

    const propValueEls = MICRO_CHART_CHECKED_PROPS.map((propName) => getPropertyValueElement(record, propName));

    for (const [i, propValueEl] of propValueEls.entries()) {
        if (!propValueEl) {
            continue;
        }
        const propName = MICRO_CHART_CHECKED_PROPS[i];
        const propertyType: 'measure' | 'dimension' = propName === 'Measures' ? 'measure' : 'dimension';
        const [collection] = elementsWithName(Edm.Collection, propValueEl);
        if (!collection) {
            continue;
        }

        for (const propPath of elementsWithName(Edm.PropertyPath, collection)) {
            const pathValue = getElementText(propPath) ?? '';
            if (violatesNavigationRule(pathValue, chartEntityType, service)) {
                problems.push({
                    type: MICRO_CHART_REQUIRES_NAVIGATION_ENTITY,
                    pageNames,
                    propertyType,
                    annotation: {
                        reference: { uri: annotation.top.uri, value: propPath },
                        reportedParent: annotationElement
                    }
                });
            }
        }
    }
}

type ChartLookupItem = { annotation?: { annotation?: IndexedAnnotation; annotationPath?: string } };
type ChartPageEntry = {
    pageNames: string[];
    chartEntityType: MetadataElement;
    service: ParsedService;
};

/**
 * Returns `true` when the navigation path from `fromEntityType` passes through at least one
 * collection-valued (1:n) association.  When the chart entity is already a collection row,
 * its direct properties are valid measure/dimension references without any further navigation.
 *
 * Traversal mirrors `violatesNavigationRule`: walks each segment via the entity-type index,
 * following to-one hops until a 1:n hop is found or the path is exhausted.
 * An unresolvable segment causes an early `false` return (safe fallback — run the check).
 *
 * @param navSegments - Navigation property names before the `@` in the annotation path.
 * @param fromEntityType - Fully-qualified entity type name of the page (starting point).
 * @param service - Parsed OData service used for metadata resolution.
 * @returns `true` when any segment is collection-valued.
 */
function isReachedViaCollectionNavigation(
    navSegments: string[],
    fromEntityType: string,
    service: ParsedService
): boolean {
    let currentEntityType = fromEntityType;
    for (const segment of navSegments) {
        const navElement = getEntityTypeForContextPath(`/${currentEntityType}/${segment}`, service);
        if (!navElement) {
            return false; // Unresolvable — don't skip; run the check.
        }
        if (navElement.isCollectionValued === true) {
            return true; // Confirmed 1:n — chart entity is a collection row.
        }
        if (navElement.structuredType) {
            currentEntityType = navElement.structuredType; // Follow to-one hop.
        } else {
            return false; // Not a navigation property — don't skip.
        }
    }
    return false;
}

/**
 * Registers a single chart lookup item into the page map, keyed by its `IndexedAnnotation`.
 *
 * @param map - The map being built.
 * @param chart - A single chart lookup entry from `page.lookup['chart']`.
 * @param targetName - The page target name that references this chart.
 * @param pageTargetName - The target name of the page that references this chart.
 * @param service - The OData service associated with the app that owns this chart.
 */
function addChartToPageMap(
    map: Map<IndexedAnnotation, ChartPageEntry>,
    chart: ChartLookupItem,
    targetName: string,
    pageTargetName: string,
    service: ParsedService
): void {
    const indexedAnnotation = chart.annotation?.annotation;
    if (!indexedAnnotation) {
        return;
    }
    const chartEntityType = service.artifacts.metadataService.getMetadataElement(targetName);
    if (!chartEntityType) {
        return;
    }
    const entry = map.get(indexedAnnotation) ?? { pageNames: [] as string[], chartEntityType, service };
    if (!entry.pageNames.includes(pageTargetName)) {
        entry.pageNames.push(pageTargetName);
    }
    map.set(indexedAnnotation, entry);
}

/**
 * Builds a map from each `IndexedAnnotation` to its page target-names, the page entity, and
 * the owning OData service, collected from `lookup['chart']` entries across all apps in the project.
 *
 * @param sourceCode - The Fiori annotation source code providing the project context.
 * @returns A `Map` keyed by `IndexedAnnotation`, valued by page names, the page entity, and the OData service.
 */
function buildChartPageMap(sourceCode: FioriAnnotationSourceCode): Map<IndexedAnnotation, ChartPageEntry> {
    const chartPageMap = new Map<IndexedAnnotation, ChartPageEntry>();
    for (const appKey of Object.keys(sourceCode.projectContext.linkedModel.apps)) {
        const linkedApp = sourceCode.projectContext.linkedModel.apps[appKey];
        const appIndex = sourceCode.projectContext.index.apps[appKey];
        const service = appIndex ? sourceCode.projectContext.getIndexedServiceForMainService(appIndex) : undefined;
        if (!service) {
            continue;
        }
        for (const page of linkedApp.pages) {
            const pageTyped = page as { lookup?: Record<string, ChartLookupItem[]>; entity?: MetadataElement };
            const charts = pageTyped.lookup?.['chart'] ?? [];
            const pageEntityTypePath = pageTyped.entity?.structuredType;
            for (const chart of charts) {
                const chartEntityType = chart.annotation?.annotation?.target ?? '';
                if (pageEntityTypePath && chartEntityType !== pageEntityTypePath) {
                    // Only skip when the path to the chart entity contains a confirmed 1:n hop.
                    // A to-one (e.g. toAddress/@UI.Chart) still requires the chart measures
                    // and dimensions to traverse a 1:n navigation from the chart entity.
                    const rawPath = chart.annotation?.annotationPath ?? '';
                    const atIdx = rawPath.indexOf('@');
                    const navPart = atIdx > 0 ? rawPath.substring(0, atIdx).replace(/\/$/, '') : '';
                    const navSegments = navPart ? navPart.split('/').filter(Boolean) : [];
                    if (isReachedViaCollectionNavigation(navSegments, pageEntityTypePath, service)) {
                        continue;
                    }
                }
                addChartToPageMap(chartPageMap, chart, chartEntityType, page.targetName, service);
            }
        }
    }
    return chartPageMap;
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: MICRO_CHART_REQUIRES_NAVIGATION_ENTITY,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Micro chart measures and dimensions must use a 1:n navigation entity path.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-micro-chart-requires-navigation-entity.md'
        },
        messages: {
            [MICRO_CHART_REQUIRES_NAVIGATION_ENTITY]:
                'Micro chart {{propertyType}} must reference a property from a 1:n navigation entity.'
        }
    },
    check(context) {
        if (!(context.sourceCode instanceof FioriAnnotationSourceCode)) {
            return [];
        }
        const problems: MicroChartRequiresNavigationEntity[] = [];
        const chartPageMap = buildChartPageMap(context.sourceCode);
        for (const [annotation, { pageNames, service }] of chartPageMap) {
            checkChartAnnotation(annotation, pageNames, annotation.target, service, problems);
        }
        return problems;
    },
    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        const lookup = new Set<Element>();
        for (const diagnostic of validationResult) {
            lookup.add(diagnostic.annotation.reportedParent);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element): void {
                if (!lookup.has(node)) {
                    return;
                }
                validationResult
                    .filter((r) => r.annotation.reportedParent === node)
                    .forEach((r) => {
                        context.report({
                            node: r.annotation.reference.value,
                            messageId: MICRO_CHART_REQUIRES_NAVIGATION_ENTITY,
                            data: { propertyType: r.propertyType }
                        });
                    });
            }
        };
    }
});

export default rule;
