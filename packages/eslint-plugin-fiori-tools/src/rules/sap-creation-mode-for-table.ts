import type { RuleVisitor } from '@eslint/core';
import type { MemberNode } from '@humanwhocodes/momoa';

import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import type { CreateModeMessageId, CreationModeForTable } from '../language/diagnostics';
import { CREATION_MODE_FOR_TABLE } from '../language/diagnostics';
import type { ParsedApp } from '../project-context/parser';

const RECOMMENDED_MODE_V2 = 'creationRows';
// const RECOMMENDED_MODE_V4 = 'InlineCreationRows';

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
            configurationPath: string[]
        ): void => {
            problems.push({
                type: CREATION_MODE_FOR_TABLE,
                messageId,
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
                    const tableType = table.configuration.tableType?.valueInFile;

                    // Check if it's an AnalyticalTable with createMode configured at any level
                    if (tableType === 'AnalyticalTable') {
                        if (sectionCreateMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                parsedApp,
                                sectionCreateMode.configurationPath
                            );
                            continue;
                        }
                        if (pageCreateMode.valueInFile) {
                            reportDiagnostic(
                                'analyticalTableNotSupported',
                                parsedApp,
                                pageCreateMode.configurationPath
                            );
                            continue;
                        }
                        if (appCreateMode.valueInFile) {
                            reportDiagnostic('analyticalTableNotSupported', parsedApp, appCreateMode.configurationPath);
                            continue;
                        }
                    }

                    // Check section level first (highest priority)
                    if (sectionCreateMode.valueInFile) {
                        if (!sectionCreateMode.values.includes(sectionCreateMode.valueInFile)) {
                            // invalid value
                            reportDiagnostic('invalidCreateMode', parsedApp, sectionCreateMode.configurationPath);
                            continue;
                        }
                        if (sectionCreateMode.valueInFile !== RECOMMENDED_MODE_V2) {
                            // recommend better value
                            reportDiagnostic('recommendCreationRows', parsedApp, sectionCreateMode.configurationPath);
                        }
                        continue;
                    }

                    if (pageCreateMode.valueInFile) {
                        // check page level (second highest priority)
                        if (!pageCreateMode.values.includes(pageCreateMode.valueInFile)) {
                            // invalid value
                            reportDiagnostic('invalidCreateMode', parsedApp, pageCreateMode.configurationPath);
                            continue;
                        }
                        if (pageCreateMode.valueInFile !== RECOMMENDED_MODE_V2) {
                            // recommend better value
                            reportDiagnostic('recommendCreationRows', parsedApp, pageCreateMode.configurationPath);
                        }
                        continue;
                    }

                    if (appCreateMode.valueInFile) {
                        // check app level (lowest priority)
                        if (!appCreateMode.values.includes(appCreateMode.valueInFile)) {
                            // invalid value
                            reportDiagnostic('invalidCreateMode', parsedApp, appCreateMode.configurationPath);
                            continue;
                        }
                        if (appCreateMode.valueInFile !== RECOMMENDED_MODE_V2) {
                            // recommend better value
                            reportDiagnostic('recommendCreationRows', parsedApp, appCreateMode.configurationPath);
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
                        reportDiagnostic('suggestAppLevel', parsedApp, appCreateMode.configurationPath);
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
            const matcherString =
                diagnostic.messageId === 'suggestAppLevel'
                    ? context.sourceCode.createStrictMatcherString(diagnostic.manifest.propertyPath)
                    : context.sourceCode.createMatcherString(diagnostic.manifest.propertyPath);

            if (!matchers[matcherString]) {
                matchers[matcherString] = function report(node: MemberNode): void {
                    context.report({
                        node,
                        messageId: diagnostic.messageId,
                        data: {
                            value: node.value.type === 'String' ? node.value.value : String(node.value)
                        }
                    });
                };
            }
        }

        return matchers;
    }
});

export default rule;
