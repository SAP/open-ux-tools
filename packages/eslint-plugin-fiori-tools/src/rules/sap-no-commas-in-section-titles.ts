import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, getElementAttributeValue, elements, ELEMENT_TYPE } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import { NO_COMMAS_IN_SECTION_TITLES, type NoCommasInSectionTitles } from '../language/diagnostics.js';
import type { IndexedAnnotation } from '../project-context/parser/index.js';
import type { FeV4ObjectPage, FeV4ListReport } from '../project-context/linker/fe-v4.js';
import type { FeV2ObjectPage, FeV2ListReport } from '../project-context/linker/fe-v2.js';

/**
 * Checks all facet records (CollectionFacet and ReferenceFacet) in a collection for comma-containing labels.
 *
 * @param collection - The collection element from a UI.Facets or UI.HeaderFacets annotation
 * @param facetUri - The URI of the annotation file
 * @param facetAnnotationPath - The annotation path for the parent facet
 * @param problems - Array to push discovered problems into
 */
function collectCommaLabelsFromCollection(
    collection: Element,
    facetUri: string,
    facetAnnotationPath: string,
    problems: NoCommasInSectionTitles[]
): void {
    const records = elementsWithName(Edm.Record, collection);
    for (const record of records) {
        const labelPropertyValues = elements(
            (el) =>
                el.type === ELEMENT_TYPE &&
                el.name === Edm.PropertyValue &&
                el.attributes[Edm.Property]?.value === 'Label',
            record
        );
        for (const labelPV of labelPropertyValues) {
            const labelString = getElementAttributeValue(labelPV, Edm.String);
            if (labelString?.includes(',')) {
                problems.push({
                    type: NO_COMMAS_IN_SECTION_TITLES,
                    pageNames: [],
                    annotation: {
                        file: facetUri,
                        annotationPath: facetAnnotationPath,
                        reference: {
                            uri: facetUri,
                            value: labelPV
                        },
                        labelValue: labelString
                    }
                });
            }
        }
        // Recurse into nested CollectionFacet Facets children (subsections)
        const nestedFacetsPropertyValues = elements(
            (el) =>
                el.type === ELEMENT_TYPE &&
                el.name === Edm.PropertyValue &&
                el.attributes[Edm.Property]?.value === 'Facets',
            record
        );
        for (const nestedFacetsPV of nestedFacetsPropertyValues) {
            const [nestedCollection] = elementsWithName(Edm.Collection, nestedFacetsPV);
            if (nestedCollection) {
                collectCommaLabelsFromCollection(nestedCollection, facetUri, facetAnnotationPath, problems);
            }
        }
    }
}

/**
 * Checks a facets IndexedAnnotation for comma-containing labels, skipping already-seen annotations.
 *
 * @param facetsAnnotation - The UI.Facets or UI.HeaderFacets indexed annotation
 * @param seen - Set of already-checked annotation top values to avoid duplicates
 * @param problems - Array to push discovered problems into
 */
function checkFacetsAnnotation(
    facetsAnnotation: IndexedAnnotation,
    seen: Set<Element>,
    problems: NoCommasInSectionTitles[]
): void {
    if (seen.has(facetsAnnotation.top.value)) {
        return;
    }
    seen.add(facetsAnnotation.top.value);
    const [collection] = elementsWithName(Edm.Collection, facetsAnnotation.top.value);
    if (!collection) {
        return;
    }
    collectCommaLabelsFromCollection(collection, facetsAnnotation.top.uri, `@${facetsAnnotation.term}`, problems);
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: NO_COMMAS_IN_SECTION_TITLES,
    meta: {
        type: 'problem',
        docs: {
            recommended: true,
            description:
                'Section and subsection titles (UI.Facets Label) must not contain commas, as commas are used as delimiters for backend message grouping.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-commas-in-section-titles.md'
        },
        messages: {
            [NO_COMMAS_IN_SECTION_TITLES]:
                'Section title "{{labelValue}}" must not contain commas. Commas are used as delimiters for grouping backend messages and their presence in facet labels will break message grouping at runtime.'
        }
    },

    check(context) {
        const problems: NoCommasInSectionTitles[] = [];
        const seen = new Set<Element>();

        for (const app of Object.values(context.sourceCode.projectContext.linkedModel.apps)) {
            for (const page of app.pages as (FeV4ObjectPage | FeV4ListReport | FeV2ObjectPage | FeV2ListReport)[]) {
                const sections = (page as FeV4ObjectPage | FeV2ObjectPage).sections ?? [];
                for (const section of sections) {
                    if (section.type !== 'orphan-section') {
                        const facetsAnnotation = section.annotation?.annotation;
                        if (facetsAnnotation) {
                            checkFacetsAnnotation(facetsAnnotation, seen, problems);
                        }
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

        const lookup = new Map<Element, NoCommasInSectionTitles>();
        for (const diagnostic of validationResult) {
            lookup.set(diagnostic.annotation.reference.value, diagnostic);
        }

        return {
            ['element[name="PropertyValue"]'](node: Element): void {
                const diagnostic = lookup.get(node);
                if (!diagnostic) {
                    return;
                }
                context.report({
                    node,
                    messageId: NO_COMMAS_IN_SECTION_TITLES,
                    data: {
                        labelValue: diagnostic.annotation.labelValue
                    }
                });
            }
        };
    }
});

export default rule;
