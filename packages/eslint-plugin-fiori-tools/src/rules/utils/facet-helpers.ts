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
 * Adds or merges a violation into the problems array.
 * If the same element is already reported, merges pageNames.
 *
 * @param problems - Array of found rule violations (mutated in place)
 * @param violatingElement - The violating element
 * @param pageName - Name of the page where violation occurs
 * @param annotationUri - URI of the annotation file
 * @param annotationValue - Parent annotation value element
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
 * Deduplicates: if the same element is shared across pages, merges pageNames.
 *
 * @param page - Object page (V4 or V2)
 * @param parsedService - Parsed annotation service
 * @param problems - Array of found rule violations (mutated in place)
 * @param violationType - The type/ID of the violation
 * @param findViolations - Function that finds violating elements in a facets collection
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
