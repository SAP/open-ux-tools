import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { NoSingleFacetInCollection } from '../language/diagnostics.js';
import { NO_SINGLE_FACET_IN_COLLECTION } from '../language/diagnostics.js';
import { getRecordType } from '../project-context/linker/annotations.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';
import { UI_COLLECTION_FACET, UI_REFERENCE_FACET } from '../constants.js';
import { getFacetsChildCollection, checkPageFacetAnnotations } from './utils/facet-helpers.js';

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
 * @returns Array of CollectionFacet records containing exactly one ReferenceFacet
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
                '`UI.CollectionFacet` should not contain a single `UI.ReferenceFacet`. Use `UI.ReferenceFacet` directly under `UI.Facets` instead.'
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
                checkPageFacetAnnotations(
                    page,
                    parsedService,
                    problems,
                    NO_SINGLE_FACET_IN_COLLECTION,
                    findCollectionFacetsWithSingleChild
                );
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
