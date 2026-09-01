import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, getElementAttributeValue } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import { NO_COMMA_IN_SECTION_TITLE } from '../language/diagnostics.js';
import type { NoCommaInSectionTitle } from '../language/diagnostics.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';
import { FioriI18nSourceCode } from '../language/i18n/source-code.js';
import type { I18nEntry } from '../language/i18n/source-code.js';
import type { ProjectContext } from '../project-context/project-context.js';
import { buildAnnotationIndexKey } from '../project-context/parser/index.js';
import type { IndexedAnnotation, ParsedService } from '../project-context/parser/index.js';
import { getRecordType } from '../project-context/linker/annotations.js';

const UI_FACETS = 'com.sap.vocabularies.UI.v1.Facets';
const COLLECTION_FACET_TYPE = 'com.sap.vocabularies.UI.v1.CollectionFacet';
const I18N_BINDING_REGEX = /^\{[@]?i18n>(.+)\}$/;

/**
 * Gets a string value from an element's attribute or from a child element's text content.
 * Handles both XML (attribute-based) and CDS (child element text) annotation formats.
 *
 * @param element - The element to read from
 * @param valueName - The attribute or child element name to look for
 * @returns The string value, or empty string if not found
 */
function getAttrOrChildText(element: Element, valueName: string): string {
    const fromAttr = getElementAttributeValue(element, valueName);
    if (fromAttr) {
        return fromAttr;
    }
    const [childEl] = elementsWithName(valueName, element);
    const textNode = childEl?.content?.find((c) => c.type === 'text');
    return textNode?.type === 'text' && textNode.text ? textNode.text : '';
}

/**
 * Extracts an i18n binding key from a label string.
 * Matches patterns like `{i18n>key}` (with or without the `@` prefix).
 *
 * @param label - The label string to parse
 * @returns The extracted i18n key, or undefined if not an i18n binding
 */
function extractI18nKey(label: string): string | undefined {
    return I18N_BINDING_REGEX.exec(label)?.[1];
}

/**
 * Finds the `Label` PropertyValue element within a facet record.
 *
 * @param record - The facet record element to search
 * @returns The Label PropertyValue element, or undefined if not found
 */
function getLabelPropValue(record: Element): Element | undefined {
    return elementsWithName(Edm.PropertyValue, record).find(
        (pv) => getElementAttributeValue(pv, Edm.Property) === 'Label'
    );
}

/**
 * Collects sub-records from a CollectionFacet's nested `Facets` property.
 *
 * @param record - The CollectionFacet record element
 * @returns Array of nested facet record elements
 */
function getCollectionFacetSubRecords(record: Element): Element[] {
    const facetsPv = elementsWithName(Edm.PropertyValue, record).find(
        (pv) => getElementAttributeValue(pv, Edm.Property) === 'Facets'
    );
    if (!facetsPv) {
        return [];
    }
    const [nestedCollection] = elementsWithName(Edm.Collection, facetsPv);
    if (!nestedCollection) {
        return [];
    }
    return elementsWithName(Edm.Record, nestedCollection);
}

/**
 * Adds a comma-in-section-title annotation diagnostic, merging page names if the same label element was already reported.
 *
 * @param labelPv - The Label PropertyValue element to report on
 * @param facetsAnnotation - The parent UI.Facets indexed annotation
 * @param pageName - The object page target name
 * @param problems - Accumulator array for diagnostics
 */
function addAnnotationProblem(
    labelPv: Element,
    facetsAnnotation: IndexedAnnotation,
    pageName: string,
    problems: NoCommaInSectionTitle[]
): void {
    const existing = problems.findIndex((p) => p.annotation?.reference.value === labelPv);
    if (existing > -1) {
        problems[existing] = {
            ...problems[existing],
            pageNames: [...problems[existing].pageNames, pageName]
        };
    } else {
        problems.push({
            type: NO_COMMA_IN_SECTION_TITLE,
            pageNames: [pageName],
            annotation: {
                reference: { uri: facetsAnnotation.top.uri, value: labelPv },
                reportedParent: facetsAnnotation.top.value
            }
        });
    }
}

/**
 * Checks a single facet record's Label for a direct comma.
 * Labels that are i18n bindings are skipped here and checked separately in the i18n pass.
 *
 * @param record - The facet record element
 * @param facetsAnnotation - The parent UI.Facets indexed annotation
 * @param pageName - The object page target name
 * @param problems - Accumulator array for diagnostics
 */
function checkFacetRecord(
    record: Element,
    facetsAnnotation: IndexedAnnotation,
    pageName: string,
    problems: NoCommaInSectionTitle[]
): void {
    const labelPropValue = getLabelPropValue(record);
    if (!labelPropValue) {
        return;
    }
    const labelStr = getAttrOrChildText(labelPropValue, Edm.String);
    if (!labelStr) {
        return;
    }
    if (extractI18nKey(labelStr) !== undefined) {
        // i18n binding — checked separately in the i18n pass
        return;
    }
    if (labelStr.includes(',')) {
        addAnnotationProblem(labelPropValue, facetsAnnotation, pageName, problems);
    }
}

/**
 * Checks all records in a UI.Facets annotation for direct Labels with comma strings,
 * including sub-records nested inside CollectionFacet entries.
 *
 * @param facetsAnnotation - The indexed UI.Facets annotation
 * @param aliasInfo - Alias information for resolving record types
 * @param pageName - The object page target name
 * @param problems - Accumulator array for diagnostics
 */
function checkFacetsAnnotation(
    facetsAnnotation: IndexedAnnotation,
    aliasInfo: AliasInformation,
    pageName: string,
    problems: NoCommaInSectionTitle[]
): void {
    const [collection] = elementsWithName(Edm.Collection, facetsAnnotation.top.value);
    if (!collection) {
        return;
    }
    for (const record of elementsWithName(Edm.Record, collection)) {
        checkFacetRecord(record, facetsAnnotation, pageName, problems);
        if (getRecordType(aliasInfo, record) === COLLECTION_FACET_TYPE) {
            for (const subRecord of getCollectionFacetSubRecords(record)) {
                checkFacetRecord(subRecord, facetsAnnotation, pageName, problems);
            }
        }
    }
}

/**
 * Checks all UI.Facets annotations for a given object page entity type.
 *
 * @param entityType - The entity type name
 * @param pageName - The object page target name
 * @param parsedService - The parsed OData service
 * @param problems - Accumulator array for diagnostics
 */
function checkObjectPageFacets(
    entityType: string,
    pageName: string,
    parsedService: ParsedService,
    problems: NoCommaInSectionTitle[]
): void {
    const facetsMap = parsedService.index.annotations[buildAnnotationIndexKey(entityType, UI_FACETS)];
    if (!facetsMap) {
        return;
    }
    for (const annotation of Object.values(facetsMap)) {
        const aliasInfo = parsedService.artifacts.aliasInfo[annotation.top.uri];
        checkFacetsAnnotation(annotation, aliasInfo, pageName, problems);
    }
}

/**
 * Checks all UI.Facets annotations across all apps for direct section/subsection labels with commas.
 * i18n-bound labels are skipped and handled by the i18n pass.
 *
 * @param sourceCode - The Fiori annotation source code being linted
 * @returns Array of diagnostics for sections/subsections with comma-containing labels
 */
function checkAnnotationSource(sourceCode: FioriAnnotationSourceCode): NoCommaInSectionTitle[] {
    const problems: NoCommaInSectionTitle[] = [];
    for (const [appKey, app] of Object.entries(sourceCode.projectContext.linkedModel.apps)) {
        const parsedApp = sourceCode.projectContext.index.apps[appKey];
        const parsedService = sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
        if (!parsedService) {
            continue;
        }
        for (const page of app.pages) {
            if (page.type !== 'object-page') {
                continue;
            }
            const entityType = page.entity?.structuredType;
            if (!entityType) {
                continue;
            }
            checkObjectPageFacets(entityType, page.targetName, parsedService, problems);
        }
    }
    return problems;
}

/**
 * Extracts the i18n key from a facet record's Label into the key-to-page-names map.
 *
 * @param record - The facet record element
 * @param pageName - The object page target name
 * @param keyToPageNames - Map being populated with i18n keys to page names
 */
function extractRecordI18nKey(record: Element, pageName: string, keyToPageNames: Map<string, string[]>): void {
    const labelPropValue = getLabelPropValue(record);
    if (!labelPropValue) {
        return;
    }
    const i18nKey = extractI18nKey(getAttrOrChildText(labelPropValue, Edm.String));
    if (!i18nKey) {
        return;
    }
    const existing = keyToPageNames.get(i18nKey) ?? [];
    keyToPageNames.set(i18nKey, [...existing, pageName]);
}

/**
 * Collects all i18n keys used as section/subsection labels in the facets of a given entity type.
 *
 * @param entityType - The entity type name
 * @param pageName - The object page target name
 * @param parsedService - The parsed OData service
 * @param keyToPageNames - Map being populated with i18n keys to page names
 */
function collectFacetI18nKeys(
    entityType: string,
    pageName: string,
    parsedService: ParsedService,
    keyToPageNames: Map<string, string[]>
): void {
    const facetsMap = parsedService.index.annotations[buildAnnotationIndexKey(entityType, UI_FACETS)];
    if (!facetsMap) {
        return;
    }
    for (const annotation of Object.values(facetsMap)) {
        const [collection] = elementsWithName(Edm.Collection, annotation.top.value);
        if (!collection) {
            continue;
        }
        const aliasInfo = parsedService.artifacts.aliasInfo[annotation.top.uri];
        for (const record of elementsWithName(Edm.Record, collection)) {
            extractRecordI18nKey(record, pageName, keyToPageNames);
            if (getRecordType(aliasInfo, record) === COLLECTION_FACET_TYPE) {
                for (const sub of getCollectionFacetSubRecords(record)) {
                    extractRecordI18nKey(sub, pageName, keyToPageNames);
                }
            }
        }
    }
}

/**
 * Traverses the project context to collect all i18n keys used as object page section/subsection labels.
 *
 * @param projectContext - The project context
 * @returns Map from i18n key to the list of page names using that key as a label
 */
function collectSectionLabelKeys(projectContext: ProjectContext): Map<string, string[]> {
    const keyToPageNames = new Map<string, string[]>();
    for (const [appKey, app] of Object.entries(projectContext.linkedModel.apps)) {
        const parsedApp = projectContext.index.apps[appKey];
        const parsedService = projectContext.getIndexedServiceForMainService(parsedApp);
        if (!parsedService) {
            continue;
        }
        for (const page of app.pages) {
            if (page.type !== 'object-page') {
                continue;
            }
            const entityType = page.entity?.structuredType;
            if (!entityType) {
                continue;
            }
            collectFacetI18nKeys(entityType, page.targetName, parsedService, keyToPageNames);
        }
    }
    return keyToPageNames;
}

/**
 * Checks a .properties file for i18n entries whose keys are used as section/subsection labels
 * and whose values contain commas.
 *
 * @param sourceCode - The Fiori i18n source code being linted
 * @returns Array of diagnostics for i18n entries with comma-containing values
 */
function checkI18nSource(sourceCode: FioriI18nSourceCode): NoCommaInSectionTitle[] {
    const problems: NoCommaInSectionTitle[] = [];
    const sectionLabelKeys = collectSectionLabelKeys(sourceCode.projectContext);
    if (!sectionLabelKeys.size) {
        return problems;
    }
    for (const entry of sourceCode.ast.entries) {
        const pageNames = sectionLabelKeys.get(entry.key.value);
        if (!pageNames || !entry.value.value.includes(',')) {
            continue;
        }
        problems.push({
            type: NO_COMMA_IN_SECTION_TITLE,
            pageNames,
            i18n: { uri: sourceCode.uri, entry }
        });
    }
    return problems;
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: NO_COMMA_IN_SECTION_TITLE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Section and subsection titles in SAP Fiori elements object pages must not contain commas.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-comma-in-section-title.md'
        },
        messages: {
            [NO_COMMA_IN_SECTION_TITLE]:
                'Section or subsection title must not contain commas. Commas are used as delimiters for backend message grouping.'
        }
    },
    check(context) {
        if (context.sourceCode instanceof FioriAnnotationSourceCode) {
            return checkAnnotationSource(context.sourceCode);
        }
        if (context.sourceCode instanceof FioriI18nSourceCode) {
            return checkI18nSource(context.sourceCode);
        }
        return [];
    },
    createAnnotations(context, validationResult) {
        const annotationDiagnostics = validationResult.filter((r) => r.annotation !== undefined);
        if (!annotationDiagnostics.length) {
            return {};
        }
        const lookup = new Set(annotationDiagnostics.map((r) => r.annotation!.reportedParent));
        return {
            ['target>element[name="Annotation"]'](node: Element): void {
                if (!lookup.has(node)) {
                    return;
                }
                annotationDiagnostics
                    .filter((r) => r.annotation!.reportedParent === node)
                    .forEach((r) =>
                        context.report({ node: r.annotation!.reference.value, messageId: NO_COMMA_IN_SECTION_TITLE })
                    );
            }
        };
    },
    createI18n(context, validationResult) {
        const i18nDiagnostics = validationResult.filter((r) => r.i18n !== undefined);
        if (!i18nDiagnostics.length) {
            return {};
        }
        return {
            'i18n-entry'(node: I18nEntry): void {
                const diagnostic = i18nDiagnostics.find((r) => r.i18n!.entry === node);
                if (diagnostic) {
                    context.report({ node, messageId: NO_COMMA_IN_SECTION_TITLE });
                }
            }
        };
    }
});

export default rule;
