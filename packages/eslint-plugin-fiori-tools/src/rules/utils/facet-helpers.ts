/**
 * Shared utilities for facet-related ESLint rules
 */
import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { getPropertyValueElement } from '../../project-context/linker/annotations.js';
import { buildAnnotationIndexKey, type ParsedService } from '../../project-context/parser/index.js';
import type { FeV4ObjectPage } from '../../project-context/linker/fe-v4.js';
import type { FeV2ObjectPage } from '../../project-context/linker/fe-v2.js';

export const UI_FACETS = 'com.sap.vocabularies.UI.v1.Facets';
export const UI_COLLECTION_FACET = 'com.sap.vocabularies.UI.v1.CollectionFacet';
export const UI_REFERENCE_FACET = 'com.sap.vocabularies.UI.v1.ReferenceFacet';

/**
 * Returns the child Collection element of the Facets property inside a CollectionFacet record, if present.
 *
 * @param record - A CollectionFacet Record element
 * @returns The child Collection element, or undefined
 */
export function getFacetsChildCollection(record: Element): Element | undefined {
    const facetsPropertyValue = getPropertyValueElement(record, 'Facets');
    if (!facetsPropertyValue) {
        return undefined;
    }
    const [childCollection] = elementsWithName(Edm.Collection, facetsPropertyValue);
    return childCollection;
}

/**
 * Generic interface for annotation-based violations that can be deduplicated across pages
 */
export interface AnnotationViolation {
    type: string;
    pageNames: string[];
    annotation: {
        reference: {
            uri: string;
            value: Element;
        };
        reportedParent: Element;
    };
}

/**
 * Adds or merges a violation into the problem's array.
 * If the same record is already reported, merges pageNames.
 *
 * @param problems - An array of identified rule violations (mutated in place)
 * @param violatingElement - The violating annotation record
 * @param pageName - The name of the page where the violation occurs
 * @param annotationUri - The URI of the annotation file
 * @param annotationValue - The Value element of the parent annotation
 * @param violationType - The type/ID of the violation
 */
export function addOrMergeViolation<T extends AnnotationViolation>(
    problems: T[],
    violatingElement: Element,
    pageName: string,
    annotationUri: string,
    annotationValue: Element,
    violationType: string
): void {
    const existingIndex = problems.findIndex((p) => p.annotation.reference.value === violatingElement);
    if (existingIndex > -1) {
        problems[existingIndex] = {
            ...problems[existingIndex],
            pageNames: [...problems[existingIndex].pageNames, pageName]
        };
    } else {
        problems.push({
            type: violationType,
            pageNames: [pageName],
            annotation: {
                reference: {
                    uri: annotationUri,
                    value: violatingElement
                },
                reportedParent: annotationValue
            }
        } as T);
    }
}

/**
 * Generic function to check page facet annotations for violations.
 *
 * This function checks an object page's UI.Facets annotations for various violations
 * depending on the provided findViolations function. Common use cases include:
 * - Checks an object page's UI.Facets annotations for CollectionFacets at the third level or deeper.
 * - Checks an object page's UI.Facets annotations for CollectionFacets with a single ReferenceFacet child
 *
 * Deduplicates: if the same record is shared across pages, merges pageNames.
 *
 * @param page - Object page (OData V4 or OData V2)
 * @param parsedService - The parsed annotation service
 * @param problems - An array of identified rule violations (mutated in place)
 * @param violationType - The type/ID of the violation
 * @param findViolations - Function that finds violating records in a facets collection
 */
export function checkPageFacetAnnotations<T extends AnnotationViolation>(
    page: FeV4ObjectPage | FeV2ObjectPage,
    parsedService: ParsedService,
    problems: T[],
    violationType: string,
    findViolations: (facetsCollection: Element, aliasInfo: any) => Element[]
): void {
    const entityType = page.entity?.structuredType;
    if (!entityType) {
        return;
    }

    const annotationKey = buildAnnotationIndexKey(entityType, UI_FACETS);
    const annotationMap = parsedService.index.annotations[annotationKey];
    if (!annotationMap) {
        return;
    }

    for (const annotation of Object.values(annotationMap)) {
        const aliasInfo = parsedService.artifacts.aliasInfo[annotation.top.uri];
        const [facetsCollection] = elementsWithName(Edm.Collection, annotation.top.value);
        if (!facetsCollection) {
            continue;
        }

        const violations = findViolations(facetsCollection, aliasInfo);
        for (const violatingElement of violations) {
            addOrMergeViolation(
                problems,
                violatingElement,
                page.targetName,
                annotation.top.uri,
                annotation.top.value,
                violationType
            );
        }
    }
}
