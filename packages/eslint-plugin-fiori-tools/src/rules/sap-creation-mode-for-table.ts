import type { MemberNode } from '@humanwhocodes/momoa';

import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import type { CreateModeMessageId, CreationModeForTable } from '../language/diagnostics';
import { CREATION_MODE_FOR_TABLE } from '../language/diagnostics';
import type { ParsedApp } from '../project-context/parser';

const RECOMMENDED_MODE_V2 = 'creationRows';
const RECOMMENDED_MODE_V4_RESPONSIVE_GRID = 'InlineCreationRows';
const RECOMMENDED_MODE_V4_TREE = 'Inline';

const rule: FioriRuleDefinition = createFioriRule<CreateModeMessageId, [], {}, CreationModeForTable['type']>({
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
                'Invalid createMode value "{{value}}" for {{tableType}}. Recommended value is "creationRows". Valid values are: {{validValues}}.',
            recommendCreationRows: 'Consider using "creationRows" for better user experience instead of "{{value}}".',
            suggestAppLevel: 'Consider adding createMode at application level for better user experience.',
            analyticalTableNotSupported:
                'Creation mode is not supported for Analytical tables. Remove the createMode/creationMode property.',
            invalidCreateModeV4:
                'Invalid creationMode value "{{value}}" for {{tableType}}. Recommended value is "{{recommendedValue}}". Valid values are: {{validValues}}.',
            recommendInlineCreationRowsV4:
                'Consider using "{{recommendedValue}}" for better user experience instead of "{{value}}".',
            suggestAppLevelV4: 'Consider adding creationMode at application level for better user experience.'
        }
    },
    check(context) {
        const problems: CreationModeForTable[] = [];
        const reportDiagnostic = (
            messageId: CreateModeMessageId,
            pageName: string,
            parsedApp: ParsedApp,
            configurationPath: string[],
            tableType: string,
            validValues: string[] = [],
            recommendedValue?: string
        ): void => {
            problems.push({
                type: CREATION_MODE_FOR_TABLE,
                messageId,
                pageName,
                tableType,
                validValues,
                recommendedValue,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: configurationPath
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
                                page.targetName,
                                parsedApp,
                                sectionCreateMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                        if (pageCreateMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                page.targetName,
                                parsedApp,
                                pageCreateMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                        if (appCreateMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                page.targetName,
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
                                page.targetName,
                                parsedApp,
                                sectionCreateMode.configurationPath,
                                tableType,
                                sectionCreateMode.values
                            );
                            continue;
                        }
                        if (sectionCreateMode.valueInFile !== RECOMMENDED_MODE_V2) {
                            // recommend better value
                            reportDiagnostic(
                                'recommendCreationRows',
                                page.targetName,
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
                                page.targetName,
                                parsedApp,
                                pageCreateMode.configurationPath,
                                tableType,
                                pageCreateMode.values
                            );
                            continue;
                        }
                        if (pageCreateMode.valueInFile !== RECOMMENDED_MODE_V2) {
                            // recommend better value
                            reportDiagnostic(
                                'recommendCreationRows',
                                page.targetName,
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
                                page.targetName,
                                parsedApp,
                                appCreateMode.configurationPath,
                                tableType,
                                appCreateMode.values
                            );
                            continue;
                        }
                        if (appCreateMode.valueInFile !== RECOMMENDED_MODE_V2) {
                            // recommend better value
                            reportDiagnostic(
                                'recommendCreationRows',
                                page.targetName,
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
                        reportDiagnostic(
                            'suggestAppLevel',
                            page.targetName,
                            parsedApp,
                            appCreateMode.configurationPath,
                            tableType
                        );
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
            const appCreateMode = app.configuration.createMode;
            for (const page of app.pages) {
                if (page.type !== 'object-page') {
                    continue;
                }
                const tables = page.lookup['table'] ?? [];

                for (const table of tables) {
                    const tableCreationMode = table.configuration.creationMode;
                    const tableType = table.configuration.tableType?.valueInFile ?? '';

                    // Check if it's an AnalyticalTable with createMode configured at any level
                    if (tableType === 'AnalyticalTable') {
                        if (tableCreationMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                page.targetName,
                                parsedApp,
                                tableCreationMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                        if (appCreateMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                page.targetName,
                                parsedApp,
                                appCreateMode.configurationPath,
                                tableType
                            );
                            continue;
                        }
                    }

                    // Determine valid values and recommended value based on table type
                    const validValues = table.configuration.creationMode.values;
                    let recommendedValue: string;

                    if (tableType === 'TreeTable') {
                        recommendedValue = RECOMMENDED_MODE_V4_TREE;
                    } else {
                        // ResponsiveTable, GridTable, or default
                        recommendedValue = RECOMMENDED_MODE_V4_RESPONSIVE_GRID;
                    }

                    // Check table level configuration (highest priority)
                    if (tableCreationMode.valueInFile) {
                        if (!validValues.includes(tableCreationMode.valueInFile)) {
                            // invalid value
                            reportDiagnostic(
                                'invalidCreateModeV4',
                                page.targetName,
                                parsedApp,
                                tableCreationMode.configurationPath,
                                tableType,
                                validValues,
                                recommendedValue
                            );
                            continue;
                        }
                        if (tableCreationMode.valueInFile !== recommendedValue) {
                            // recommend better value
                            reportDiagnostic(
                                'recommendInlineCreationRowsV4',
                                page.targetName,
                                parsedApp,
                                tableCreationMode.configurationPath,
                                tableType,
                                [],
                                recommendedValue
                            );
                        }
                        continue;
                    }

                    // Check application level configuration (lower priority)
                    if (appCreateMode.valueInFile) {
                        if (!validValues.includes(appCreateMode.valueInFile)) {
                            // invalid value at application level for this table type
                            reportDiagnostic(
                                'invalidCreateModeV4',
                                page.targetName,
                                parsedApp,
                                table.configuration.creationMode.configurationPath,
                                tableType,
                                validValues,
                                recommendedValue
                            );
                            continue;
                        }
                        // Only warn if it's not the recommended value for this table type
                        if (appCreateMode.valueInFile !== recommendedValue) {
                            reportDiagnostic(
                                'recommendInlineCreationRowsV4',
                                page.targetName,
                                parsedApp,
                                table.configuration.creationMode.configurationPath,
                                tableType,
                                [],
                                recommendedValue
                            );
                        }
                        continue;
                    }

                    // Suggest adding creationMode at table level only once per page
                    if (
                        !problems.some(
                            (p) =>
                                p.messageId === 'suggestAppLevelV4' && p.manifest.uri === parsedApp.manifest.manifestUri
                        )
                    ) {
                        reportDiagnostic(
                            'suggestAppLevelV4',
                            '',
                            parsedApp,
                            appCreateMode.configurationPath,
                            tableType
                        );
                    }
                }
            }
        }

        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic) =>
        function report(node: MemberNode): void {
            let tableType: string;
            if (diagnostic.tableType === 'TreeTable') {
                tableType = 'Tree Table';
            } else {
                // ResponsiveTable, GridTable, or default
                tableType = diagnostic.tableType === 'GridTable' ? 'Grid Table' : 'Responsive Table';
            }
            let value = String(node.value);
            if (node.value.type === 'String') {
                value = node.value.value;
            } else if (node.name.type === 'String') {
                value = node.name.value;
            }
            context.report({
                node,
                messageId: diagnostic.messageId,
                data: {
                    value,
                    tableType,
                    validValues: diagnostic.validValues?.join(', ') ?? '',
                    recommendedValue: diagnostic.recommendedValue ?? ''
                }
            });
        }
});

export default rule;
