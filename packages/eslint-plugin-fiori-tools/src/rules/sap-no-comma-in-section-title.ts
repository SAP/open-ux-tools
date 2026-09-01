import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import { NO_COMMA_IN_SECTION_TITLE } from '../language/diagnostics.js';
import type { NoCommaInSectionTitle } from '../language/diagnostics.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';
import { FioriI18nSourceCode } from '../language/i18n/source-code.js';
import type { I18nEntry } from '../language/i18n/source-code.js';
import { buildAnnotationIndexKey } from '../project-context/parser/index.js';
import type { IndexedAnnotation, ParsedService } from '../project-context/parser/index.js';
import { getRecordType } from '../project-context/linker/annotations.js';
import {
    COLLECTION_FACET_TYPE,
    collectSectionLabelKeys,
    extractI18nKey,
    getAttrOrChildText,
    getCollectionFacetSubRecords,
    getLabelPropValue
} from '../project-context/linker/i18n.js';

const UI_FACETS = 'com.sap.vocabularies.UI.v1.Facets';

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
                const diagnostic = i18nDiagnostics.some((r) => r.i18n!.entry === node);
                if (diagnostic) {
                    context.report({ node, messageId: NO_COMMA_IN_SECTION_TITLE });
                }
            }
        };
    }
});

export default rule;
