import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, elements } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { MicroChartRequiresNavigationEntity } from '../language/diagnostics.js';
import { MICRO_CHART_REQUIRES_NAVIGATION_ENTITY } from '../language/diagnostics.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';
import type { IndexedAnnotation } from '../project-context/parser/index.js';

/** Annotation record properties whose `PropertyPath` values must use a navigation path. */
const MICRO_CHART_CHECKED_PROPS = ['Measures', 'Dimensions'] as const;

/**
 * Returns the text content of a `PropertyPath` element.
 * In both XML and CDS representations the path value is stored as a text node.
 *
 * @param element - The `PropertyPath` element to read.
 * @returns The path string, or an empty string if the element has no text content.
 */
function getPropertyPathText(element: Element): string {
    const textNode = element.content?.find((c) => c.type === 'text');
    return textNode?.type === 'text' && textNode.text ? textNode.text : '';
}

/**
 * Inspects a single `UI.Chart` annotation and appends one diagnostic (reported on the
 * annotation node itself) when any `Measures` or `Dimensions` `PropertyPath` lacks a
 * navigation separator (`/`).
 *
 * @param annotation - The indexed annotation entry containing the top-level element and its URI.
 * @param annotation.top - The top-level annotation node.
 * @param annotation.top.uri - Source URI of the annotation document.
 * @param annotation.top.value - The parsed annotation `Element`.
 * @param pageNames - Names of pages that reference this chart annotation.
 * @param problems - Accumulator array to which new diagnostics are pushed.
 */
function checkChartAnnotation(
    annotation: { top: { uri: string; value: Element } },
    pageNames: string[],
    problems: MicroChartRequiresNavigationEntity[]
): void {
    const annotationElement = annotation.top.value;
    const [record] = elementsWithName(Edm.Record, annotationElement);
    if (!record) {
        return;
    }

    for (const propName of MICRO_CHART_CHECKED_PROPS) {
        const propValueEl = elements(
            (el) => el.name === Edm.PropertyValue && el.attributes[Edm.Property]?.value === propName,
            record
        )[0];
        if (!propValueEl) {
            continue;
        }

        const [collection] = elementsWithName(Edm.Collection, propValueEl);
        if (!collection) {
            continue;
        }

        for (const propPath of elementsWithName(Edm.PropertyPath, collection)) {
            const pathValue = getPropertyPathText(propPath);
            if (pathValue && !pathValue.includes('/')) {
                problems.push({
                    type: MICRO_CHART_REQUIRES_NAVIGATION_ENTITY,
                    pageNames,
                    annotation: {
                        reference: { uri: annotation.top.uri, value: annotationElement },
                        reportedParent: annotationElement
                    }
                });
                return;
            }
        }
    }
}

type ChartLookupItem = { annotation?: { annotation?: IndexedAnnotation } };

/**
 * Registers a single chart lookup item into the page map, keyed by its `IndexedAnnotation`.
 *
 * @param map - The map being built.
 * @param chart - A single chart lookup entry from `page.lookup['chart']`.
 * @param targetName - The page target name that references this chart.
 */
function addChartToPageMap(map: Map<IndexedAnnotation, string[]>, chart: ChartLookupItem, targetName: string): void {
    const indexedAnnotation = chart.annotation?.annotation;
    if (!indexedAnnotation) {
        return;
    }
    const names = map.get(indexedAnnotation) ?? [];
    if (!names.includes(targetName)) {
        names.push(targetName);
    }
    map.set(indexedAnnotation, names);
}

/**
 * Builds a map from each `IndexedAnnotation` to the list of page target-names that
 * reference it via `lookup['chart']` entries across all apps in the project.
 *
 * @param sourceCode - The Fiori annotation source code providing the project context.
 * @returns A `Map` keyed by `IndexedAnnotation`, valued by an array of page target-names.
 */
function buildChartPageMap(sourceCode: FioriAnnotationSourceCode): Map<IndexedAnnotation, string[]> {
    const chartPageMap = new Map<IndexedAnnotation, string[]>();
    for (const appKey of Object.keys(sourceCode.projectContext.linkedModel.apps)) {
        const linkedApp = sourceCode.projectContext.linkedModel.apps[appKey];
        for (const page of linkedApp.pages) {
            const charts = (page as { lookup?: Record<string, ChartLookupItem[]> }).lookup?.['chart'] ?? [];
            for (const chart of charts) {
                addChartToPageMap(chartPageMap, chart, page.targetName);
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
                'Micro chart measures and dimensions must reference properties from a 1:n navigation entity.'
        }
    },
    check(context) {
        if (!(context.sourceCode instanceof FioriAnnotationSourceCode)) {
            return [];
        }
        const problems: MicroChartRequiresNavigationEntity[] = [];
        const chartPageMap = buildChartPageMap(context.sourceCode);
        for (const [annotation, pageNames] of chartPageMap) {
            checkChartAnnotation(annotation, pageNames, problems);
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
                            messageId: MICRO_CHART_REQUIRES_NAVIGATION_ENTITY
                        });
                    });
            }
        };
    }
});

export default rule;
