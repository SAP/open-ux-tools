import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import {
    Edm,
    elementsWithName,
    elements,
    getElementAttributeValue,
    toFullyQualifiedName,
    parseIdentifier
} from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { NoPathHiddenOnInteractiveColumns } from '../language/diagnostics.js';
import { NO_PATH_HIDDEN_ON_INTERACTIVE_COLUMNS } from '../language/diagnostics.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';
import type { FeV4ObjectPage, FeV4ListReport } from '../project-context/linker/fe-v4.js';
import type { FeV2ListReport, FeV2ObjectPage } from '../project-context/linker/fe-v2.js';
import { type ParsedService, buildAnnotationIndexKey } from '../project-context/parser/index.js';
import type { TableNode } from '../project-context/linker/annotations.js';
import { UI_HIDDEN, CAPABILITIES_SORT_RESTRICTIONS, CAPABILITIES_FILTER_RESTRICTIONS } from '../constants.js';

/**
 * Returns the set of property names that are explicitly restricted (non-sortable or non-filterable)
 * for the given entity type by reading the Capabilities annotation from the service index.
 *
 * @param entityType - Fully qualified entity type name
 * @param parsedService - Parsed OData service
 * @param capTerm - Fully qualified Capabilities term (SortRestrictions or FilterRestrictions)
 * @param restrictionProperty - Property name inside the Capabilities record (NonSortableProperties or NonFilterableProperties)
 */
function getRestrictedProperties(
    entityType: string,
    parsedService: ParsedService,
    capTerm: string,
    restrictionProperty: string
): Set<string> {
    const key = buildAnnotationIndexKey(entityType, capTerm);
    const annotationMap = parsedService.index.annotations[key];
    if (!annotationMap) {
        return new Set();
    }
    const annotation = annotationMap['undefined'];
    if (!annotation) {
        return new Set();
    }
    const [record] = elementsWithName(Edm.Record, annotation.top.value);
    if (!record) {
        return new Set();
    }
    const [propValueEl] = elements(
        (el) => el.name === Edm.PropertyValue && getElementAttributeValue(el, Edm.Property) === restrictionProperty,
        record
    );
    if (!propValueEl) {
        return new Set();
    }
    const [collection] = elementsWithName(Edm.Collection, propValueEl);
    if (!collection) {
        return new Set();
    }
    const restricted = new Set<string>();
    for (const child of collection.content) {
        if ((child as Element).name === 'PropertyPath') {
            const textNode = (child as Element).content?.find((c) => c.type === 'text');
            if (textNode?.type === 'text' && textNode.text) {
                restricted.add(textNode.text);
            }
        }
    }
    return restricted;
}

/**
 * Returns the path value from an element, handling both XML attribute style and
 * CDS child-element style (where the path is stored as a `<Path>text</Path>` child).
 *
 * @param element - The element to extract the path value from
 */
function getPathValue(element: Element): string {
    const fromAttr = getElementAttributeValue(element, Edm.Path);
    if (fromAttr) {
        return fromAttr;
    }
    const [pathEl] = elementsWithName(Edm.Path, element);
    const textNode = pathEl?.content?.find((c) => c.type === 'text');
    return textNode?.type === 'text' && textNode.text ? textNode.text : '';
}

/**
 * Finds a child `UI.Hidden` annotation with a dynamic path (not a static Bool) on a DataField record.
 *
 * @param record - The DataField record element
 * @param aliasInfo - Alias information for resolving annotation terms
 */
function getDynamicHiddenAnnotation(record: Element, aliasInfo: AliasInformation): Element | undefined {
    return elementsWithName(Edm.Annotation, record).find((ann) => {
        const termAttr = getElementAttributeValue(ann, Edm.Term);
        if (!termAttr) {
            return false;
        }
        const resolvedTerm = toFullyQualifiedName(
            aliasInfo.aliasMap,
            aliasInfo.currentFileNamespace,
            parseIdentifier(termAttr)
        );
        return resolvedTerm === UI_HIDDEN && !!getPathValue(ann);
    });
}

/**
 * Checks a single table item's LineItem annotation for DataField records that use a dynamic
 * UI.Hidden annotation on a column that is still sortable or filterable per Capabilities restrictions.
 *
 * @param item - Table item with an optional annotation node
 * @param item.annotation - The table annotation node, if resolved by the linker
 * @param targetName - Page target name (used for grouping diagnostics)
 * @param parsedService - Parsed OData service
 * @param problems - Accumulator for found violations
 */
function processTableItem(
    item: { annotation?: TableNode },
    targetName: string,
    parsedService: ParsedService,
    problems: NoPathHiddenOnInteractiveColumns[]
): void {
    if (!item.annotation) {
        return;
    }
    const lineItemAnnotation = item.annotation.annotation;
    const aliasInfo = parsedService.artifacts.aliasInfo[lineItemAnnotation.top.uri];
    const entityType = lineItemAnnotation.target;

    const [collection] = elementsWithName(Edm.Collection, lineItemAnnotation.top.value);
    if (!collection) {
        return;
    }

    const nonSortable = getRestrictedProperties(
        entityType,
        parsedService,
        CAPABILITIES_SORT_RESTRICTIONS,
        'NonSortableProperties'
    );
    const nonFilterable = getRestrictedProperties(
        entityType,
        parsedService,
        CAPABILITIES_FILTER_RESTRICTIONS,
        'NonFilterableProperties'
    );

    for (const record of elementsWithName(Edm.Record, collection)) {
        const hiddenWithPath = getDynamicHiddenAnnotation(record, aliasInfo);
        if (!hiddenWithPath) {
            continue;
        }

        const [valuePV] = elements(
            (el) => el.name === Edm.PropertyValue && getElementAttributeValue(el, Edm.Property) === 'Value',
            record
        );
        const valuePath = valuePV ? getPathValue(valuePV) : '';
        if (!valuePath) {
            continue;
        }

        // Column is not interactive only when explicitly restricted for BOTH sort and filter
        if (nonSortable.has(valuePath) && nonFilterable.has(valuePath)) {
            continue;
        }

        const existingIndex = problems.findIndex((p) => p.annotation.reference.value === hiddenWithPath);
        if (existingIndex > -1) {
            problems[existingIndex] = {
                ...problems[existingIndex],
                pageNames: [...problems[existingIndex].pageNames, targetName]
            };
        } else {
            problems.push({
                type: NO_PATH_HIDDEN_ON_INTERACTIVE_COLUMNS,
                pageNames: [targetName],
                annotation: {
                    reference: {
                        uri: lineItemAnnotation.top.uri,
                        value: hiddenWithPath
                    },
                    reportedParent: lineItemAnnotation.top.value
                }
            });
        }
    }
}

/**
 * Checks all tables in a page for violations. For list report pages the tables are in
 * `page.lookup['table']`; for object pages they are nested inside table sections.
 *
 * @param page - Application page (V2 or V4)
 * @param parsedService - Parsed OData service
 * @param problems - Accumulator for found violations
 */
function checkTablesInPage(
    page: FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage,
    parsedService: ParsedService,
    problems: NoPathHiddenOnInteractiveColumns[]
): void {
    if (page.type === 'list-report-page') {
        for (const item of page.lookup['table'] ?? []) {
            processTableItem(item, page.targetName, parsedService, problems);
        }
    } else {
        for (const section of page.sections) {
            if (section.type !== 'table-section') {
                continue;
            }
            const item = section.children.find((c) => c.type === 'table');
            if (item) {
                processTableItem(item, page.targetName, parsedService, problems);
            }
        }
    }
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: NO_PATH_HIDDEN_ON_INTERACTIVE_COLUMNS,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'UI.Hidden with a dynamic path must not be used on columns that support sorting or filtering.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-path-hidden-on-interactive-columns.md'
        },
        messages: {
            [NO_PATH_HIDDEN_ON_INTERACTIVE_COLUMNS]:
                'UI.Hidden with a path-based value must not be used on a sortable or filterable column. Use a static UI.Hidden or restrict sorting and filtering via Capabilities annotations.'
        }
    },
    check(context) {
        if (!(context.sourceCode instanceof FioriAnnotationSourceCode)) {
            return [];
        }
        const problems: NoPathHiddenOnInteractiveColumns[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            for (const page of app.pages) {
                checkTablesInPage(page, parsedService, problems);
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
                            node: r.annotation.reference.value,
                            messageId: NO_PATH_HIDDEN_ON_INTERACTIVE_COLUMNS
                        });
                    });
            }
        };
    }
});

export default rule;
