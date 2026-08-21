import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, elements, getElementAttributeValue } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { GroupingSupportedTableTypesOnly } from '../language/diagnostics.js';
import { GROUPING_SUPPORTED_TABLE_TYPES_ONLY } from '../language/diagnostics.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';
import { FioriJSONSourceCode } from '../language/json/source-code.js';
import type { FeV4PageType, Table as FeV4Table } from '../project-context/linker/fe-v4.js';
import type { Table as FeV2Table, FeV2PageType } from '../project-context/linker/fe-v2.js';
import type { IndexedAnnotation, ParsedApp, ParsedService } from '../project-context/parser/index.js';
import { buildAnnotationIndexKey } from '../project-context/parser/index.js';
import type { MemberNode } from '@humanwhocodes/momoa';
import { isV2Table } from '../utils/helpers.js';
import { createJsonFixer } from '../language/rule-fixer.js';

const GROUPABLE_TABLE_TYPES = new Set(['AnalyticalTable', 'ResponsiveTable']);
const UI_PRESENTATION_VARIANT = 'com.sap.vocabularies.UI.v1.PresentationVariant';

/**
 * Returns the `GroupBy` PropertyValue element from a UI.PresentationVariant annotation element if
 * its GroupBy collection contains at least one PropertyPath; otherwise returns `undefined`.
 *
 * @param annotationTopValue - The top-level value element of the PresentationVariant annotation
 * @returns The GroupBy PropertyValue element, or undefined if not found or collection is empty
 */
function getGroupByPropertyValue(annotationTopValue: Element): Element | undefined {
    const [record] = elementsWithName(Edm.Record, annotationTopValue);
    if (!record) {
        return undefined;
    }
    const [groupByPV] = elements(
        (el) => el.name === Edm.PropertyValue && getElementAttributeValue(el, Edm.Property) === 'GroupBy',
        record
    );
    if (!groupByPV) {
        return undefined;
    }
    const [collection] = elementsWithName(Edm.Collection, groupByPV);
    if (!collection) {
        return undefined;
    }
    return elementsWithName('PropertyPath', collection).length > 0 ? groupByPV : undefined;
}

/**
 * Checks a single table for UI.PresentationVariant GroupBy violations and appends any
 * found violations to the problems array.
 *
 * @param table - The linked table node (V4 or V2)
 * @param parsedService - Parsed OData service with annotation index
 * @returns - Group enabled, annotation and value
 */
function collectAnnotationGrouping(
    table: FeV4Table | FeV2Table,
    parsedService: ParsedService
): { group: boolean; annotation?: IndexedAnnotation; propertyValue?: Element } {
    if (!table.annotation) {
        return { group: false };
    }
    const tableType = table.configuration.tableType.valueInFile;
    if (!tableType || GROUPABLE_TABLE_TYPES.has(tableType)) {
        return { group: false };
    }
    const entityType: string = table.annotation.annotation.target;
    const key = buildAnnotationIndexKey(entityType, UI_PRESENTATION_VARIANT);
    const annotationMap = parsedService.index.annotations[key];
    if (!annotationMap) {
        return { group: false };
    }
    for (const annotation of Object.values(annotationMap)) {
        const propertyValue = getGroupByPropertyValue(annotation.top.value);
        if (!propertyValue) {
            continue;
        }
        return { group: true, annotation, propertyValue };
    }
    return { group: false };
}

/**
 * Checks if grouping is enabled in the manifest.
 *
 * @param table - Table settings to check
 * @returns - Group enabled and group path in the manifest
 */
function checkGroupingEnabledInManifest(table: FeV4Table): { group: boolean; groupPath: string[] } {
    const personalization = table.configuration.personalization.valueInFile;
    let groupPath: string[] | undefined;
    if (typeof personalization === 'object' && personalization !== null && personalization.group === true) {
        groupPath = [...table.configuration.personalization.configurationPath, 'group'];
    }
    if (!groupPath) {
        return { group: false, groupPath: [] };
    }
    return { group: true, groupPath };
}

/**
 * Checks a single V4 table for manifest personalization.group violations and appends any
 * found violations to the problems array. Flags both `personalization = true` (all
 * personalization explicitly enabled) and `personalization = { group: true }`.
 *
 * @param table - The V4 linked table
 * @param pageName - The routing target name of the page containing this table
 * @param parsedApp - Parsed application with manifest data
 * @param sourceCode - FioriJSONSourceCode for JSON node resolution
 * @param problems - Accumulator for found violations
 */
function collectGroupingViolation(
    table: FeV4Table | FeV2Table,
    pageName: string,
    parsedApp: ParsedApp,
    sourceCode: FioriJSONSourceCode | FioriAnnotationSourceCode,
    problems: GroupingSupportedTableTypesOnly[]
): void {
    const tableType = table.configuration.tableType.valueInFile;
    if (!tableType || GROUPABLE_TABLE_TYPES.has(tableType)) {
        return;
    }
    if (!isV2Table(table)) {
        // report personalization group node
        const { group, groupPath } = checkGroupingEnabledInManifest(table);
        if (group && sourceCode instanceof FioriJSONSourceCode) {
            const node = sourceCode.getNode(sourceCode.ast.body, groupPath);
            problems.push({
                type: GROUPING_SUPPORTED_TABLE_TYPES_ONLY,
                tableType,
                pageName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: groupPath,
                    loc: node.loc
                }
            });
        }
    }
    const parsedService = sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
    if (!parsedService) {
        return;
    }
    const { group, annotation, propertyValue } = collectAnnotationGrouping(table, parsedService);
    // report annotation node
    if (group && annotation && propertyValue) {
        problems.push({
            type: GROUPING_SUPPORTED_TABLE_TYPES_ONLY,
            tableType,
            pageNames: [pageName],
            annotation: {
                reference: { uri: annotation.top.uri, value: propertyValue },
                reportedParent: annotation.top.value
            }
        });
    }
}

/**
 * Checks all V4 tables in a page for manifest personalization.group violations.
 *
 * @param page - V4 application page
 * @param parsedApp - Parsed application with manifest data
 * @param sourceCode - FioriJSONSourceCode for JSON node resolution
 * @param problems - Accumulator for found violations
 */
function checkGrouping(
    page: FeV4PageType | FeV2PageType,
    parsedApp: ParsedApp,
    sourceCode: FioriJSONSourceCode | FioriAnnotationSourceCode,
    problems: GroupingSupportedTableTypesOnly[]
): void {
    if (page.type === 'list-report-page') {
        for (const table of page.lookup['table'] ?? []) {
            collectGroupingViolation(table, page.targetName, parsedApp, sourceCode, problems);
        }
    } else if (page.type === 'object-page') {
        for (const section of page.sections) {
            if (section.type !== 'table-section') {
                continue;
            }
            const table = section.children.find((c) => c.type === 'table');
            if (table) {
                collectGroupingViolation(table, page.targetName, parsedApp, sourceCode, problems);
            }
        }
    }
}

/**
 * Collects manifest personalization.group violations across all V4 apps.
 *
 * @param sourceCode - FioriJSONSourceCode for the manifest file
 * @param problems - Accumulator for found violations
 */
function collectGroupForTableTypeProblems(
    sourceCode: FioriJSONSourceCode | FioriAnnotationSourceCode,
    problems: GroupingSupportedTableTypesOnly[]
): void {
    for (const [appKey, app] of Object.entries(sourceCode.projectContext.linkedModel.apps)) {
        const parsedApp = sourceCode.projectContext.index.apps[appKey];
        for (const page of app.pages) {
            checkGrouping(page, parsedApp, sourceCode, problems);
        }
    }
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: GROUPING_SUPPORTED_TABLE_TYPES_ONLY,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Grouping is only supported for "AnalyticalTable" and "ResponsiveTable" table types.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-grouping-supported-table-types-only.md'
        },
        messages: {
            [GROUPING_SUPPORTED_TABLE_TYPES_ONLY]:
                'Grouping is not supported for "{{tableType}}" table type. Disable grouping or use "AnalyticalTable" or "ResponsiveTable" table type instead.'
        },
        fixable: 'code'
    },

    check(context) {
        const problems: GroupingSupportedTableTypesOnly[] = [];
        if (
            context.sourceCode instanceof FioriJSONSourceCode ||
            context.sourceCode instanceof FioriAnnotationSourceCode
        ) {
            collectGroupForTableTypeProblems(context.sourceCode, problems);
        }
        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, paths) => {
        return function report(node: MemberNode): void {
            context.report({
                node,
                messageId: GROUPING_SUPPORTED_TABLE_TYPES_ONLY,
                data: { tableType: diagnostic.tableType },
                fix: createJsonFixer({ context, node, deepestPathResult: paths, operation: 'delete' })
            });
        };
    },
    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        const lookup = new Set<Element>();
        for (const diagnostic of validationResult) {
            if (diagnostic.annotation) {
                lookup.add(diagnostic.annotation.reportedParent);
            }
        }
        return {
            ['element[name="Annotation"]'](node: Element): void {
                if (!lookup.has(node)) {
                    return;
                }
                validationResult
                    .filter((r) => r.annotation?.reportedParent === node)
                    .forEach((r) => {
                        if (!r.annotation) {
                            return;
                        }
                        context.report({
                            node: r.annotation.reference.value,
                            messageId: GROUPING_SUPPORTED_TABLE_TYPES_ONLY,
                            data: { tableType: r.tableType }
                        });
                    });
            }
        };
    }
});

export default rule;
