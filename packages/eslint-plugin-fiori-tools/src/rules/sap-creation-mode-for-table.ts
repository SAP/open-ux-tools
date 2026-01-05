import type { RuleVisitor } from '@eslint/core';
import type { MemberNode } from '@humanwhocodes/momoa';

import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import type { CreateModeMessageId, CreationModeForTable } from '../language/diagnostics';
import { CREATION_MODE_FOR_TABLE } from '../language/diagnostics';
import type { ParsedApp } from '../project-context/parser';

const RECOMMENDED_MODE_V2 = 'creationRows';
const RECOMMENDED_MODE_V4_RESPONSIVE_GRID = 'InlineCreationRows';
const RECOMMENDED_MODE_V4_TREE = 'Inline';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: CREATION_MODE_FOR_TABLE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'Ensure proper creationMode configuration for tables in SAP Fiori Elements V2 and V4 applications',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-creation-mode-for-table.md'
        },
        messages: {
            invalidCreateMode:
                'Invalid createMode value "{{value}}". Recommended value is "creationRows". Other possible values are "creationRowsHiddenInEditMode", or "newPage".',
            recommendCreationRows: 'Consider using "creationRows" for better user experience instead of "{{value}}".',
            suggestAppLevel:
                'Consider adding createMode at application level (sap.ui.generic.app.settings.tableSettings.createMode).',
            analyticalTableNotSupported:
                'Creation mode is not supported for Analytical tables. Remove the createMode property.',
            invalidCreateModeV4:
                'Invalid creationMode value "{{value}}" for {{tableType}}. Valid values are: {{validValues}}.',
            recommendInlineCreationRowsV4:
                'Consider using "InlineCreationRows" for better user experience instead of "{{value}}".',
            suggestAppLevelV4: 'Consider adding creationMode in table settings for better user experience.'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    recommendedMode: {
                        type: 'string',
                        description: 'The recommended createMode value for V2 applications',
                        enum: ['creationRows', 'creationRowsHiddenInEditMode', 'newPage']
                    }
                    // allowInline: {
                    //     type: 'boolean',
                    //     description: 'Whether to allow the deprecated "inline" createMode'
                    // }
                },
                additionalProperties: false
            }
        ]
    },
    check(context) {
        const problems: CreationModeForTable[] = [];
        const reportDiagnostic = (
            messageId: CreateModeMessageId,
            parsedApp: ParsedApp,
            configurationPath: string[],
            tableType: string
        ) => {
            problems.push({
                type: CREATION_MODE_FOR_TABLE,
                messageId,
                tableType,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    requiredPropertyPath: configurationPath,
                    optionalPropertyPath: []
                }
            });
        };
        // Process all apps in the project for v2
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v2') {
                continue;
            }
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const appCreateMode = app.configuration.createMode;
            for (const page of app.pages) {
                if (page.type !== 'object-page') {
                    continue;
                }
                const pageCreateMode = page.configuration.createMode;

                for (const table of page.lookup['table'] ?? []) {
                    const sectionCreateMode = table.configuration.createMode;
                    const tableType = table.configuration.tableType?.valueInFile ?? '';

                    // Check if it's an AnalyticalTable with createMode configured at any level
                    if (tableType === 'AnalyticalTable') {
                        if (sectionCreateMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                parsedApp,
                                sectionCreateMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                        if (pageCreateMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                parsedApp,
                                pageCreateMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                        if (appCreateMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                parsedApp,
                                appCreateMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                    }

                    // Check section level first (highest priority)
                    if (sectionCreateMode.valueInFile) {
                        if (!sectionCreateMode.values.includes(sectionCreateMode.valueInFile)) {
                            // invalid value
                            reportDiagnostic(
                                'invalidCreateMode',
                                parsedApp,
                                sectionCreateMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                        if (sectionCreateMode.valueInFile !== RECOMMENDED_MODE_V2) {
                            // recommend better value
                            reportDiagnostic(
                                'recommendCreationRows',
                                parsedApp,
                                sectionCreateMode.configurationPath,
                                tableType
                            );
                        }
                        continue;
                    }

                    if (pageCreateMode.valueInFile) {
                        // check page level (second highest priority)
                        if (!pageCreateMode.values.includes(pageCreateMode.valueInFile)) {
                            // invalid value
                            reportDiagnostic(
                                'invalidCreateMode',
                                parsedApp,
                                pageCreateMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                        if (pageCreateMode.valueInFile !== RECOMMENDED_MODE_V2) {
                            // recommend better value
                            reportDiagnostic(
                                'recommendCreationRows',
                                parsedApp,
                                pageCreateMode.configurationPath,
                                tableType
                            );
                        }
                        continue;
                    }

                    if (appCreateMode.valueInFile) {
                        // check app level (lowest priority)
                        if (!appCreateMode.values.includes(appCreateMode.valueInFile)) {
                            // invalid value
                            reportDiagnostic(
                                'invalidCreateMode',
                                parsedApp,
                                appCreateMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                        if (appCreateMode.valueInFile !== RECOMMENDED_MODE_V2) {
                            // recommend better value
                            reportDiagnostic(
                                'recommendCreationRows',
                                parsedApp,
                                appCreateMode.configurationPath,
                                tableType
                            );
                        }
                        continue;
                    }

                    // suggest adding at app level only once
                    if (
                        !problems.some(
                            (p) =>
                                p.messageId === 'suggestAppLevel' && p.manifest.uri === parsedApp.manifest.manifestUri
                        )
                    ) {
                        reportDiagnostic('suggestAppLevel', parsedApp, appCreateMode.configurationPath, tableType);
                    }
                }
            }
        }

        // Process all apps in the project for v4
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v4') {
                continue;
            }
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];

            for (const page of app.pages) {
                // Process tables from both list-report-page and object-page
                const tables = page.lookup['table'] ?? [];

                for (const table of tables) {
                    const tableCreationMode = table.configuration.creationMode;
                    const tableType = table.configuration.tableType?.valueInFile ?? '';

                    // Check if it's an AnalyticalTable with createMode configured
                    if (tableType === 'AnalyticalTable') {
                        if (tableCreationMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                parsedApp,
                                tableCreationMode.configurationPath,
                                tableType
                            );
                        }
                        continue;
                    }

                    // Determine valid values and recommended value based on table type
                    const validValues = table.configuration.creationMode.values;
                    let recommendedValue: string;
                    let tableTypeName: string;

                    if (tableType === 'TreeTable') {
                        recommendedValue = RECOMMENDED_MODE_V4_TREE;
                        tableTypeName = 'Tree Table';
                    } else {
                        // ResponsiveTable, GridTable, or default
                        recommendedValue = RECOMMENDED_MODE_V4_RESPONSIVE_GRID;
                        tableTypeName = tableType === 'GridTable' ? 'Grid Table' : 'Responsive Table';
                    }

                    // Check table level configuration
                    if (tableCreationMode.valueInFile) {
                        if (!validValues.includes(tableCreationMode.valueInFile)) {
                            // invalid value
                            reportDiagnostic(
                                'invalidCreateModeV4',
                                parsedApp,
                                tableCreationMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                        if (tableCreationMode.valueInFile !== recommendedValue) {
                            // recommend better value
                            reportDiagnostic(
                                'recommendInlineCreationRowsV4',
                                parsedApp,
                                tableCreationMode.configurationPath,
                                tableType
                            );
                        }
                        continue;
                    }

                    // Suggest adding creationMode at table level only once per page
                    if (
                        !problems.some(
                            (p) =>
                                p.messageId === 'suggestAppLevelV4' &&
                                p.manifest.uri === parsedApp.manifest.manifestUri &&
                                JSON.stringify(p.manifest.requiredPropertyPath).includes(page.targetName)
                        )
                    ) {
                        reportDiagnostic(
                            'suggestAppLevelV4',
                            parsedApp,
                            tableCreationMode.configurationPath,
                            tableType
                        );
                    }
                }
            }
        }

        return problems;
    },
    createJson(context, diagnostics) {
        if (diagnostics.length === 0) {
            return {};
        }

        const matchers: RuleVisitor = {};

        for (const diagnostic of diagnostics) {
            const matcherString = context.sourceCode.createMatcherString(diagnostic.manifest.requiredPropertyPath, {
                strict: diagnostic.messageId === 'suggestAppLevel'
            });

            if (!matchers[matcherString]) {
                matchers[matcherString] = function report(node: MemberNode): void {
                    const value = node.value.type === 'String' ? node.value.value : String(node.value);

                    // Prepare data for V4 messages
                    const data: Record<string, string> = { value };

                    if (diagnostic.messageId === 'invalidCreateModeV4') {
                        const tableType = diagnostic.tableType;
                        const tableTypeName =
                            tableType === 'TreeTable'
                                ? 'Tree Table'
                                : tableType === 'GridTable'
                                  ? 'Grid Table'
                                  : 'Responsive Table';
                        const validValues =
                            tableType === 'TreeTable'
                                ? 'Inline, NewPage, CreationDialog'
                                : 'InlineCreationRows, NewPage';

                        data.tableType = tableTypeName;
                        data.validValues = validValues;
                    }

                    context.report({
                        node,
                        messageId: diagnostic.messageId,
                        data
                    });
                };
            }
        }

        return matchers;
    }
});

export default rule;
