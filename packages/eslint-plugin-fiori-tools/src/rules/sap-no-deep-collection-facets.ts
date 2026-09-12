import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { NoDeepCollectionFacets } from '../language/diagnostics.js';
import { NO_DEEP_COLLECTION_FACETS } from '../language/diagnostics.js';
import { getRecordType, getPropertyValueElement } from '../project-context/linker/annotations.js';
import { buildAnnotationIndexKey, type ParsedService } from '../project-context/parser/index.js';
import type { FeV4ObjectPage } from '../project-context/linker/fe-v4.js';
import type { FeV2ObjectPage } from '../project-context/linker/fe-v2.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';

const UI_FACETS = 'com.sap.vocabularies.UI.v1.Facets';
const UI_COLLECTION_FACET = 'com.sap.vocabularies.UI.v1.CollectionFacet';

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
 * Recursively finds CollectionFacet records that appear at third level or deeper.
 * Collects all violating CollectionFacets discovered during the traversal.
 *
 * @param collection - The Collection element to traverse
 * @param aliasInfo - Alias information for resolving qualified names
 * @param currentLevel - The current nesting level (1 = direct children of UI.Facets)
 * @param violations - Accumulator for found violations (mutated in place)
 */
function findDeepCollectionFacets(
    collection: Element,
    aliasInfo: AliasInformation,
    currentLevel: number,
    violations: Element[]
): void {
    const records = elementsWithName(Edm.Record, collection);

    for (const record of records) {
        const recordType = getRecordType(aliasInfo, record);

        if (recordType === UI_COLLECTION_FACET) {
            // If this CollectionFacet is at level 3 or deeper, it's a violation
            if (currentLevel >= 3) {
                violations.push(record);
            }

            // Recursively check nested Facets
            const childCollection = getFacetsChildCollection(record);
            if (childCollection) {
                findDeepCollectionFacets(childCollection, aliasInfo, currentLevel + 1, violations);
            }
        }
    }
}

/**
 * Checks an object page's UI.Facets annotations for CollectionFacets at third level or deeper.
 * Deduplicates: if the same CollectionFacet is shared across pages, merges pageNames.
 *
 * @param page - Object page (V4 or V2)
 * @param parsedService - Parsed annotation service
 * @param problems - Array of found rule violations (mutated in place)
 */
function checkPageFacetAnnotations(
    page: FeV4ObjectPage | FeV2ObjectPage,
    parsedService: ParsedService,
    problems: NoDeepCollectionFacets[]
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

        const violations: Element[] = [];
        findDeepCollectionFacets(facetsCollection, aliasInfo, 1, violations);

        for (const collectionFacet of violations) {
            const existingIndex = problems.findIndex((p) => p.annotation.reference.value === collectionFacet);
            if (existingIndex > -1) {
                problems[existingIndex] = {
                    ...problems[existingIndex],
                    pageNames: [...problems[existingIndex].pageNames, page.targetName]
                };
            } else {
                problems.push({
                    type: NO_DEEP_COLLECTION_FACETS,
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
    ruleId: NO_DEEP_COLLECTION_FACETS,
    meta: {
        type: 'problem',
        docs: {
            recommended: true,
            description: 'UI.CollectionFacet should not be nested at third level or deeper.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-deep-collection-facets.md'
        },
        messages: {
            [NO_DEEP_COLLECTION_FACETS]:
                'UI.CollectionFacet at third level or deeper is not considered by SAP Fiori elements. Reorganize your facet structure to use a maximum of two levels.'
        },
        schema: []
    },

    check(context) {
        if (!(context.sourceCode instanceof FioriAnnotationSourceCode)) {
            return [];
        }
        const problems: NoDeepCollectionFacets[] = [];

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
        const lookup = new Map<Element, NoDeepCollectionFacets[]>();
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
                        messageId: NO_DEEP_COLLECTION_FACETS
                    });
                }
            }
        };
    }
});

export default rule;
