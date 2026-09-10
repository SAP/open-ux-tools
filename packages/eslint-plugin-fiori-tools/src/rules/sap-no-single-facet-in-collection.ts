import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { NoSingleFacetInCollection } from '../language/diagnostics.js';
import { NO_SINGLE_FACET_IN_COLLECTION } from '../language/diagnostics.js';
import { getRecordType, getPropertyValueElement } from '../project-context/linker/annotations.js';
import { buildAnnotationIndexKey, type ParsedService } from '../project-context/parser/index.js';
import type { FeV4ObjectPage } from '../project-context/linker/fe-v4.js';
import type { FeV2ObjectPage } from '../project-context/linker/fe-v2.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';

const UI_FACETS = 'com.sap.vocabularies.UI.v1.Facets';
const UI_COLLECTION_FACET = 'com.sap.vocabularies.UI.v1.CollectionFacet';
const UI_REFERENCE_FACET = 'com.sap.vocabularies.UI.v1.ReferenceFacet';

/**
 * Returns the child Collection element of the Facets property inside a CollectionFacet record, if present.
 *
 * @param record - A CollectionFacet Record element
 * @returns The child Collection element, or undefined
 */
function getFacetsChildCollection(record: Element): Element | undefined {
    const facetsPropertyValue = getPropertyValueElement(record, 'Facets');
    if (!facetsPropertyValue) {
        return undefined;
    }
    const [childCollection] = elementsWithName(Edm.Collection, facetsPropertyValue);
    return childCollection;
}

/**
 * Returns true if the CollectionFacet's child collection contains exactly one ReferenceFacet.
 *
 * @param childCollection - The child Facets Collection element of a CollectionFacet
 * @param aliasInfo - Alias information for resolving qualified names
 * @returns True if the collection contains exactly one ReferenceFacet
 */
function hasSingleReferenceFacet(childCollection: Element, aliasInfo: AliasInformation): boolean {
    const childRecords = elementsWithName(Edm.Record, childCollection);
    if (childRecords.length !== 1) {
        return false;
    }
    return getRecordType(aliasInfo, childRecords[0]) === UI_REFERENCE_FACET;
}

/**
 * Finds CollectionFacet records that contain exactly one ReferenceFacet child.
 * Checks the top-level UI.Facets collection only.
 * Second-level CollectionFacets, third-level and beyond are out of scope.
 *
 * @param facetsCollection - The Collection element directly under the UI.Facets Annotation
 * @param aliasInfo - Alias information for resolving qualified names
 * @returns Array of CollectionFacet elements containing exactly one ReferenceFacet
 */
function findCollectionFacetsWithSingleChild(facetsCollection: Element, aliasInfo: AliasInformation): Element[] {
    const singleChildFacets: Element[] = [];

    for (const record of elementsWithName(Edm.Record, facetsCollection)) {
        if (getRecordType(aliasInfo, record) !== UI_COLLECTION_FACET) {
            continue;
        }

        const childCollection = getFacetsChildCollection(record);
        if (!childCollection) {
            continue;
        }

        if (hasSingleReferenceFacet(childCollection, aliasInfo)) {
            singleChildFacets.push(record);
        }
    }

    return singleChildFacets;
}

/**
 * Checks an object page's UI.Facets annotations for CollectionFacets with a single ReferenceFacet child.
 * Deduplicates: if the same CollectionFacet is shared across pages, merges pageNames.
 *
 * @param page - Object page (V4 or V2)
 * @param parsedService - Parsed annotation service
 * @param problems - Array of found rule violations (mutated in place)
 */
function checkPageFacetAnnotations(
    page: FeV4ObjectPage | FeV2ObjectPage,
    parsedService: ParsedService,
    problems: NoSingleFacetInCollection[]
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

        const singleChildFacets = findCollectionFacetsWithSingleChild(facetsCollection, aliasInfo);
        for (const collectionFacet of singleChildFacets) {
            const existingIndex = problems.findIndex((p) => p.annotation.reference.value === collectionFacet);
            if (existingIndex > -1) {
                problems[existingIndex] = {
                    ...problems[existingIndex],
                    pageNames: [...problems[existingIndex].pageNames, page.targetName]
                };
            } else {
                problems.push({
                    type: NO_SINGLE_FACET_IN_COLLECTION,
                    pageNames: [page.targetName],
                    annotation: {
                        reference: {
                            uri: annotation.top.uri,
                            value: collectionFacet
                        },
                        reportedParent: annotation.top.value
                    }
                });
            }
        }
    }
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: NO_SINGLE_FACET_IN_COLLECTION,
    meta: {
        type: 'problem',
        docs: {
            recommended: true,
            description: 'UI.CollectionFacet must not contain only one UI.ReferenceFacet.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-single-facet-in-collection.md'
        },
        messages: {
            [NO_SINGLE_FACET_IN_COLLECTION]:
                'UI.CollectionFacet should not contain single UI.ReferenceFacet. Use UI.ReferenceFacet directly under UI.Facets instead.'
        },
        schema: []
    },

    check(context) {
        if (!(context.sourceCode instanceof FioriAnnotationSourceCode)) {
            return [];
        }
        const problems: NoSingleFacetInCollection[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            for (const page of app.pages) {
                if (page.type !== 'object-page') {
                    continue;
                }
                checkPageFacetAnnotations(page, parsedService, problems);
            }
        }

        return problems;
    },

    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        const lookup = new Map<Element, NoSingleFacetInCollection[]>();
        for (const diagnostic of validationResult) {
            const existing = lookup.get(diagnostic.annotation.reportedParent);
            if (existing) {
                existing.push(diagnostic);
            } else {
                lookup.set(diagnostic.annotation.reportedParent, [diagnostic]);
            }
        }
        return {
            ['target>element[name="Annotation"]'](node: Element): void {
                const diagnostics = lookup.get(node);
                if (!diagnostics) {
                    return;
                }
                for (const r of diagnostics) {
                    context.report({
                        node: r.annotation.reference.value,
                        messageId: NO_SINGLE_FACET_IN_COLLECTION
                    });
                }
            }
        };
    }
});

export default rule;
