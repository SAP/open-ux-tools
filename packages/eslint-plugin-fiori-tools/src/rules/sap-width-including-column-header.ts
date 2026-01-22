import type { Element, AliasInformation } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, elements } from '@sap-ux/odata-annotation-core';
import type { MemberNode } from '@humanwhocodes/momoa';

import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import type { WidthIncludingColumnHeaderDiagnostic } from '../language/diagnostics';
import { WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE } from '../language/diagnostics';
import { getRecordType } from '../project-context/linker/annotations';
import type { FeV4ObjectPage, FeV4ListReport, Table } from '../project-context/linker/fe-v4';
import type { ParsedApp, ParsedService } from '../project-context/parser';

export type RequireWidthIncludingColumnHeaderOptions = {
    form: string;
};

/**
 * Determines if a table should have the widthIncludingColumnHeader property set.
 * Checks if the table's LineItem annotation contains DataFieldForAction or DataFieldForIntentBasedNavigation.
 *
 * @param table - Table to check
 * @param aliasInfo - Alias information for resolving qualified names
 * @returns True if the table should have widthIncludingColumnHeader set
 */
function shouldTableHaveWidthIncludingColumnHeader(table: Table, aliasInfo: AliasInformation): boolean {
    if (!table.annotation) {
        return false;
    }

    const [collection] = elementsWithName(Edm.Collection, table.annotation.annotation.top.value);
    if (!collection) {
        return false;
    }

    const records = elements((element) => {
        if (element.name !== Edm.Record) {
            return false;
        }
        return getRecordType(aliasInfo, element) === 'com.sap.vocabularies.UI.v1.DataField';
    }, collection);

    return (
        records.length < 6 && records.length > 0 && table.configuration.widthIncludingColumnHeader.valueInFile !== true
    );
}

/**
 * Checks tables in a page for widthIncludingColumnHeader configuration issues.
 * Adds diagnostic problems for tables that should have this property set.
 *
 * @param page - FE v4 page to check (Object Page or List Report)
 * @param parsedApp - Parsed application containing manifest data
 * @param parsedService - Parsed service containing metadata and annotations
 * @param problems - Array to collect diagnostic problems
 */
function checkTablesInPage(
    page: FeV4ObjectPage | FeV4ListReport,
    parsedApp: ParsedApp,
    parsedService: ParsedService,
    problems: WidthIncludingColumnHeaderDiagnostic[]
): void {
    for (const table of page.lookup['table'] ?? []) {
        if (!table.annotation) {
            continue;
        }
        const aliasInfo = parsedService.artifacts.aliasInfo[table.annotation.annotation.top.uri];

        if (shouldTableHaveWidthIncludingColumnHeader(table, aliasInfo)) {
            problems.push({
                type: WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
                pageName: page.targetName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: table.configuration.widthIncludingColumnHeader.configurationPath
                },
                annotation: {
                    file: table.annotation.annotation.source,
                    annotationPath: table.annotation.annotationPath,
                    reference: table.annotation.annotation.top
                }
            });
        }
    }
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'By default, the column width is calculated based on the type of the content. You can include the column header in the width calculation by setting this property to true',
            url: 'https://ui5.sap.com/#/topic/c0f6592a592e47f9bb6d09900de47412'
        },
        messages: {
            ['width-including-column-header-manifest']:
                'Small tables (< 6 columns) should use widthIncludingColumnHeader: true for better column width calculation. Add it to the control configuration for "{{table}}" table.',
            ['width-including-column-header']:
                'Small tables (< 6 columns) should use widthIncludingColumnHeader: true for better column width calculation.'
        },
        fixable: 'code'
    },
    check(context) {
        const problems: WidthIncludingColumnHeaderDiagnostic[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v4') {
                continue;
            }
            for (const page of app.pages) {
                const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
                const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
                if (!parsedService) {
                    continue;
                }

                checkTablesInPage(page, parsedApp, parsedService, problems);
            }
        }

        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, paths) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: 'width-including-column-header-manifest',
                data: {
                    table: diagnostic.annotation.annotationPath
                },
                fix(fixer) {
                    if (paths.missingSegments.length === 0) {
                        // Property exists but has wrong value - replace it
                        const expectedValue = true;
                        if (node.value.type === 'Boolean') {
                            return fixer.replaceTextRange(
                                node.value.range ?? [node.value.loc.start.offset, node.value.loc.end.offset],
                                expectedValue.toString()
                            );
                        }
                        return null;
                    } else {
                        // Property missing - need to build nested structure
                        const baseIndent = node.value.loc.end.column + 1;
                        const indent = ' '.repeat(baseIndent);

                        // Build the nested JSON structure from the missing segments
                        let jsonStructure = '';
                        const segments = paths.missingSegments;

                        // Start with the first missing segment
                        jsonStructure = `\n${indent}"${segments[0]}": `;

                        // Build nested objects for intermediate segments
                        for (let i = 1; i < segments.length - 1; i++) {
                            jsonStructure += `{\n${indent}  ${'  '.repeat(i)}"${segments[i]}": `;
                        }

                        // Add the final property with its value
                        if (segments.length === 1) {
                            // Direct property
                            jsonStructure += `true,`;
                        } else {
                            // Nested property
                            jsonStructure += `{\n${indent}  ${'  '.repeat(segments.length - 1)}"${segments[segments.length - 1]}": true\n`;

                            // Close all nested objects
                            for (let i = segments.length - 2; i >= 1; i--) {
                                jsonStructure += `${indent}  ${'  '.repeat(i)}}\n`;
                            }
                            jsonStructure += `${indent}},`;
                        }

                        const valueOffset = node.value.loc.start.offset + 1;
                        return fixer.insertTextBeforeRange([valueOffset, valueOffset], jsonStructure);
                    }
                }
            });
        },
    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }

        const lookup = new Set<Element>();
        for (const diagnostic of validationResult) {
            lookup.add(diagnostic.annotation?.reference?.value);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element) {
                if (!lookup.has(node)) {
                    return;
                }

                context.report({
                    node: node,
                    messageId: 'width-including-column-header'
                });
            }
        };
    }
});

export default rule;
