import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { NoDeepCollectionFacets } from '../language/diagnostics.js';
import { NO_DEEP_COLLECTION_FACETS } from '../language/diagnostics.js';
import { getRecordType } from '../project-context/linker/annotations.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';
import { UI_COLLECTION_FACET, getFacetsChildCollection, checkPageFacetAnnotations } from './utils/facet-helpers.js';

/**
 * Recursively finds CollectionFacet records that appear at the third level or deeper.
 * Collects all violating CollectionFacets discovered during the traversal.
 *
 * @param collection - The Collection element to traverse
 * @param aliasInfo - The alias information for resolving qualified names
 * @param currentLevel - The current nesting level (1 = direct children of UI.Facets)
 * @param violations - The accumulator for identified violations (mutated in place)
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
 * Wrapper function that finds violations in a facets collection for use with checkPageFacets.
 *
 * @param facetsCollection - The top-level UI.Facets collection
 * @param aliasInfo - Alias information for resolving qualified names
 * @returns Array of violating CollectionFacet records
 */
function findViolations(facetsCollection: Element, aliasInfo: AliasInformation): Element[] {
    const violations: Element[] = [];
    findDeepCollectionFacets(facetsCollection, aliasInfo, 1, violations);
    return violations;
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
                checkPageFacetAnnotations(page, parsedService, problems, NO_DEEP_COLLECTION_FACETS, findViolations);
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
