import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, elements } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { NoSingleFacetInCollection } from '../language/diagnostics.js';
import { NO_SINGLE_FACET_IN_COLLECTION } from '../language/diagnostics.js';
import { getRecordType } from '../project-context/linker/annotations.js';
import { buildAnnotationIndexKey } from '../project-context/parser/index.js';

const UI_FACETS = 'com.sap.vocabularies.UI.v1.Facets';
const UI_COLLECTION_FACET = 'com.sap.vocabularies.UI.v1.CollectionFacet';
const UI_REFERENCE_FACET = 'com.sap.vocabularies.UI.v1.ReferenceFacet';

/**
 * Returns the inner Facets Collection element of a CollectionFacet record, if present.
 *
 * @param record - A CollectionFacet Record element
 * @returns The inner Collection element, or undefined
 */
function getInnerFacetsCollection(record: Element): Element | undefined {
    const facetsPropertyValue = elements(
        (el) => el.name === Edm.PropertyValue && el.attributes[Edm.Property]?.value === 'Facets',
        record
    );
    if (facetsPropertyValue.length === 0) {
        return undefined;
    }
    const [innerCollection] = elementsWithName(Edm.Collection, facetsPropertyValue[0]);
    return innerCollection;
}

/**
 * Checks whether a CollectionFacet record violates the rule (contains exactly one ReferenceFacet child).
 *
 * @param record - The CollectionFacet record to check
 * @param innerCollection - Its inner Facets Collection element
 * @param aliasInfo - Alias information for resolving qualified names
 * @returns True if the record is a violation
 */
function isViolation(record: Element, innerCollection: Element, aliasInfo: AliasInformation): boolean {
    const innerRecords = elementsWithName(Edm.Record, innerCollection);
    if (innerRecords.length !== 1) {
        return false;
    }
    return getRecordType(aliasInfo, innerRecords[0]) === UI_REFERENCE_FACET;
}

/**
 * Finds CollectionFacet records that contain exactly one ReferenceFacet child.
 * Checks both the top-level UI.Facets collection and one level of nesting inside
 * CollectionFacets (second-level CollectionFacets). Third-level and beyond are out of scope.
 *
 * @param topCollection - The Collection element directly under the UI.Facets Annotation
 * @param aliasInfo - Alias information for resolving qualified names
 * @returns Array of violating CollectionFacet elements
 */
function findViolatingCollectionFacets(topCollection: Element, aliasInfo: AliasInformation): Element[] {
    const violations: Element[] = [];

    for (const record of elementsWithName(Edm.Record, topCollection)) {
        const recordType = getRecordType(aliasInfo, record);
        if (recordType !== UI_COLLECTION_FACET) {
            continue;
        }

        const innerCollection = getInnerFacetsCollection(record);
        if (!innerCollection) {
            continue;
        }

        // Check the top-level CollectionFacet itself
        if (isViolation(record, innerCollection, aliasInfo)) {
            violations.push(record);
            continue;
        }

        // Check one level of nesting: CollectionFacets inside this CollectionFacet
        for (const nestedRecord of elementsWithName(Edm.Record, innerCollection)) {
            const nestedType = getRecordType(aliasInfo, nestedRecord);
            if (nestedType !== UI_COLLECTION_FACET) {
                continue;
            }
            const nestedInnerCollection = getInnerFacetsCollection(nestedRecord);
            if (nestedInnerCollection && isViolation(nestedRecord, nestedInnerCollection, aliasInfo)) {
                violations.push(nestedRecord);
            }
        }
    }

    return violations;
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
                'UI.CollectionFacet must not contain only one UI.ReferenceFacet. Use UI.ReferenceFacet directly under UI.Facets instead.'
        },
        schema: []
    },

    check(context) {
        const problems: NoSingleFacetInCollection[] = [];

        for (const [, parsedApp] of Object.entries(context.sourceCode.projectContext.index.apps)) {
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }

            for (const [key, annotationMap] of Object.entries(parsedService.index.annotations)) {
                if (!key.endsWith(`/@${UI_FACETS}`)) {
                    continue;
                }
                const annotation = annotationMap['undefined'];
                if (!annotation) {
                    continue;
                }

                const aliasInfo = parsedService.artifacts.aliasInfo[annotation.top.uri];
                const [topCollection] = elementsWithName(Edm.Collection, annotation.top.value);
                if (!topCollection) {
                    continue;
                }

                const violatingRecords = findViolatingCollectionFacets(topCollection, aliasInfo);
                for (const record of violatingRecords) {
                    const alreadyReported = problems.findIndex((p) => p.annotation.reference.value === record);
                    if (alreadyReported > -1) {
                        problems[alreadyReported] = {
                            ...problems[alreadyReported],
                            pageNames: [...problems[alreadyReported].pageNames, key]
                        };
                    } else {
                        problems.push({
                            type: NO_SINGLE_FACET_IN_COLLECTION,
                            pageNames: [key],
                            annotation: {
                                file: annotation.top.uri,
                                annotationPath: `@${UI_FACETS}`,
                                reference: {
                                    uri: annotation.top.uri,
                                    value: record
                                },
                                reportedParent: annotation.top.value
                            }
                        });
                    }
                }
            }
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
                            node: r.annotation.reference.value as Element,
                            messageId: NO_SINGLE_FACET_IN_COLLECTION
                        });
                    });
            }
        };
    }
});

export default rule;
