import type { MemberNode } from '@humanwhocodes/momoa';
import type { RuleContext } from '@eslint/core';

import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import type { CreateModeMessageId, CreationModeForTable } from '../language/diagnostics';
import { CREATION_MODE_FOR_TABLE } from '../language/diagnostics';
import type { ParsedApp } from '../project-context/parser';
import type { FioriLanguageOptions, FioriSourceCode, Node } from '../language/fiori-language';
import type { Table as V2Table, FeV2ObjectPage } from '../project-context/linker/fe-v2';
import type { Table as V4Table, FeV4ObjectPage } from '../project-context/linker/fe-v4';
import { createJsonFixer } from '../language/rule-fixer';

const RECOMMENDED_MODE_V2 = 'creationRows';
const RECOMMENDED_MODE_V4_RESPONSIVE_GRID = 'InlineCreationRows';
const RECOMMENDED_MODE_V4_TREE = 'Inline';

interface CreateModeConfig {
    valueInFile?: string;
    values: string[];
    configurationPath: string[];
}

/**
 * Reports a diagnostic issue related to creation mode configuration.
 *
 * @param problems - Array to collect diagnostic problems
 * @param options - Diagnostic options
 * @param options.messageId - The message identifier for the diagnostic
 * @param options.pageName - Name of the page where the issue occurs
 * @param options.parsedApp - Parsed application context
 * @param options.configurationPath - Path to the configuration in manifest
 * @param options.tableType - Type of table (e.g., 'GridTable', 'ResponsiveTable')
 * @param options.validValues - Valid values for the configuration
 * @param options.recommendedValue - Recommended value for the configuration
 */
function reportDiagnostic(
    problems: CreationModeForTable[],
    {
        messageId,
        pageName,
        parsedApp,
        configurationPath,
        tableType,
        validValues = [],
        recommendedValue
    }: {
        messageId: CreateModeMessageId;
        pageName: string;
        parsedApp: ParsedApp;
        configurationPath: string[];
        tableType: string;
        validValues?: string[];
        recommendedValue?: string;
    }
): void {
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
}

/**
 * Checks if an analytical table has createMode configured at any level in V2 applications.
 * Analytical tables do not support creation mode and this function reports diagnostics if configured.
 *
 * @param tableType - Type of the table
 * @param sectionCreateMode - Create mode configuration at section level
 * @param pageCreateMode - Create mode configuration at page level
 * @param appCreateMode - Create mode configuration at application level
 * @param pageName - Name of the page
 * @param parsedApp - Parsed application context
 * @param problems - Array to collect diagnostic problems
 * @returns True if analytical table issue was found and reported, false otherwise
 */
function checkAnalyticalTableV2(
    tableType: string,
    sectionCreateMode: CreateModeConfig,
    pageCreateMode: CreateModeConfig,
    appCreateMode: CreateModeConfig,
    pageName: string,
    parsedApp: ParsedApp,
    problems: CreationModeForTable[]
): boolean {
    if (tableType !== 'AnalyticalTable') {
        return false;
    }

    if (sectionCreateMode.valueInFile) {
        reportDiagnostic(problems, {
            messageId: 'analyticalTableNotSupported',
            pageName,
            parsedApp,
            configurationPath: sectionCreateMode.configurationPath,
            tableType
        });
        return true;
    }
    if (pageCreateMode.valueInFile) {
        reportDiagnostic(problems, {
            messageId: 'analyticalTableNotSupported',
            pageName,
            parsedApp,
            configurationPath: pageCreateMode.configurationPath,
            tableType
        });
        return true;
    }
    // table type is AnalyticalTable, but there is not creation mode configured - is valid.
    return false;
}

/**
 * Validates the create mode configuration for V2 applications.
 * Checks if the value is valid and recommends the best practice value.
 *
 * @param createMode - Create mode configuration to validate
 * @param pageName - Name of the page
 * @param parsedApp - Parsed application context
 * @param tableType - Type of the table
 * @param problems - Array to collect diagnostic problems
 * @returns True if validation found and reported an issue, false if no configuration exists
 */
function validateCreateModeV2(
    createMode: CreateModeConfig,
    pageName: string,
    parsedApp: ParsedApp,
    tableType: string,
    problems: CreationModeForTable[]
): boolean {
    if (!createMode.valueInFile) {
        return false;
    }

    if (!createMode.values.includes(createMode.valueInFile)) {
        reportDiagnostic(problems, {
            messageId: 'invalidCreateMode',
            pageName,
            parsedApp,
            configurationPath: createMode.configurationPath,
            tableType,
            validValues: createMode.values,
            recommendedValue: RECOMMENDED_MODE_V2
        });
        return true;
    }

    if (createMode.valueInFile !== RECOMMENDED_MODE_V2) {
        reportDiagnostic(problems, {
            messageId: 'recommendCreationRows',
            pageName,
            parsedApp,
            configurationPath: createMode.configurationPath,
            tableType,
            recommendedValue: RECOMMENDED_MODE_V2
        });
    }
    return true;
}

/**
 * Processes a single table in a V2 application.
 * Validates create mode at section, page, and application levels with proper priority.
 *
 * @param table - The table node to process
 * @param page - The object page containing the table
 * @param appCreateMode - Application-level create mode configuration
 * @param parsedApp - Parsed application context
 * @param problems - Array to collect diagnostic problems
 */
function processTableV2(
    table: V2Table,
    page: FeV2ObjectPage,
    appCreateMode: CreateModeConfig,
    parsedApp: ParsedApp,
    problems: CreationModeForTable[]
): void {
    const sectionCreateMode = table.configuration.createMode;
    const pageCreateMode = page.configuration.createMode;
    const tableType = table.configuration.tableType?.valueInFile ?? '';

    // Check analytical table
    if (
        checkAnalyticalTableV2(
            tableType,
            sectionCreateMode,
            pageCreateMode,
            appCreateMode,
            page.targetName,
            parsedApp,
            problems
        )
    ) {
        return;
    }

    // Check section, page, then app level
    if (validateCreateModeV2(sectionCreateMode, page.targetName, parsedApp, tableType, problems)) {
        return;
    }
    if (validateCreateModeV2(pageCreateMode, page.targetName, parsedApp, tableType, problems)) {
        return;
    }
    if (validateCreateModeV2(appCreateMode, page.targetName, parsedApp, tableType, problems)) {
        return;
    }

    // Suggest app level only once
    if (!problems.some((p) => p.messageId === 'suggestAppLevel' && p.manifest.uri === parsedApp.manifest.manifestUri)) {
        reportDiagnostic(problems, {
            messageId: 'suggestAppLevel',
            pageName: page.targetName,
            parsedApp,
            configurationPath: appCreateMode.configurationPath,
            tableType,
            recommendedValue: RECOMMENDED_MODE_V2
        });
    }
}

/**
 * Checks if an analytical table has creationMode configured at any level in V4 applications.
 * Analytical tables do not support creation mode and this function reports diagnostics if configured.
 *
 * @param tableType - Type of the table
 * @param tableCreationMode - Creation mode configuration at table level
 * @param appCreateMode - Create mode configuration at application level
 * @param pageName - Name of the page
 * @param parsedApp - Parsed application context
 * @param problems - Array to collect diagnostic problems
 * @returns True if analytical table issue was found and reported, false otherwise
 */
function checkAnalyticalTableV4(
    tableType: string,
    tableCreationMode: CreateModeConfig,
    appCreateMode: CreateModeConfig,
    pageName: string,
    parsedApp: ParsedApp,
    problems: CreationModeForTable[]
): boolean {
    if (tableType !== 'AnalyticalTable') {
        return false;
    }

    if (tableCreationMode.valueInFile) {
        // Remove 'name' segment to delete the entire creationMode object
        const pathWithoutName = tableCreationMode.configurationPath.slice(0, -1);
        reportDiagnostic(problems, {
            messageId: 'analyticalTableNotSupported',
            pageName,
            parsedApp,
            configurationPath: pathWithoutName,
            tableType
        });
        return true;
    }
    // table type is AnalyticalTable, but there is not creation mode configured - is valid.
    return true;
}

/**
 * Gets the recommended creation mode value based on table type for V4 applications.
 *
 * @param tableType - Type of the table
 * @returns 'Inline' for TreeTable, 'InlineCreationRows' for other table types
 */
function getRecommendedValueV4(tableType: string): string {
    return tableType === 'TreeTable' ? RECOMMENDED_MODE_V4_TREE : RECOMMENDED_MODE_V4_RESPONSIVE_GRID;
}

/**
 * Validates the creation mode configuration for V4 applications.
 * Checks if the value is valid and recommends the best practice value based on table type.
 *
 * @param creationMode - Creation mode configuration to validate
 * @param pageName - Name of the page
 * @param parsedApp - Parsed application context
 * @param tableType - Type of the table
 * @param recommendedValue - The recommended value for this table type
 * @param problems - Array to collect diagnostic problems
 * @returns True if validation found and reported an issue, false if no configuration exists
 */
function validateCreationModeV4(
    creationMode: CreateModeConfig,
    pageName: string,
    parsedApp: ParsedApp,
    tableType: string,
    recommendedValue: string,
    problems: CreationModeForTable[],
    shouldSuggestAppLevel: boolean
): boolean {
    if (!creationMode.valueInFile && shouldSuggestAppLevel) {
        return false;
    }
    const value = creationMode.valueInFile;
    const validValues = creationMode.values;
    if (!creationMode.valueInFile) {
        reportDiagnostic(problems, {
            messageId: 'invalidCreateModeV4',
            pageName,
            parsedApp,
            configurationPath: creationMode.configurationPath,
            tableType,
            validValues,
            recommendedValue
        });
        return true;
    }

    if (!value) {
        return false;
    }

    if (!validValues.includes(value)) {
        reportDiagnostic(problems, {
            messageId: 'invalidCreateModeV4',
            pageName,
            parsedApp,
            configurationPath: creationMode.configurationPath,
            tableType,
            validValues,
            recommendedValue
        });
        return true;
    }

    if (value !== recommendedValue) {
        reportDiagnostic(problems, {
            messageId: 'recommendInlineCreationRowsV4',
            pageName,
            parsedApp,
            configurationPath: creationMode.configurationPath,
            tableType,
            validValues,
            recommendedValue
        });
    }
    return true;
}

/**
 * Processes a single table in a V4 application.
 * Validates creation mode at table and application levels with proper priority.
 * Different table types have different recommended values.
 *
 * @param table - The table node to process
 * @param page - The object page containing the table
 * @param appCreateMode - Application-level create mode configuration
 * @param parsedApp - Parsed application context
 * @param problems - Array to collect diagnostic problems
 * @param shouldSuggestAppLevel - Whether to suggest app-level configuration (only if all tables have same recommended value)
 */
function processTableV4(
    table: V4Table,
    page: FeV4ObjectPage,
    appCreateMode: CreateModeConfig,
    parsedApp: ParsedApp,
    problems: CreationModeForTable[],
    shouldSuggestAppLevel: boolean = true
): void {
    const tableCreationMode = table.configuration.creationMode;
    const tableType = table.configuration.tableType?.valueInFile ?? '';

    // Check analytical table
    if (checkAnalyticalTableV4(tableType, tableCreationMode, appCreateMode, page.targetName, parsedApp, problems)) {
        return;
    }

    const recommendedValue = getRecommendedValueV4(tableType);

    // Check table level
    if (
        validateCreationModeV4(
            tableCreationMode,
            page.targetName,
            parsedApp,
            tableType,
            recommendedValue,
            problems,
            shouldSuggestAppLevel
        )
    ) {
        return;
    }

    // Check app level
    if (appCreateMode.valueInFile) {
        const validValues = appCreateMode.values;
        if (!validValues.includes(appCreateMode.valueInFile)) {
            reportDiagnostic(problems, {
                messageId: 'invalidCreateModeV4',
                pageName: page.targetName,
                parsedApp,
                configurationPath: appCreateMode.configurationPath,
                tableType,
                validValues,
                recommendedValue
            });
            return;
        }
        if (appCreateMode.valueInFile !== recommendedValue) {
            reportDiagnostic(problems, {
                messageId: 'recommendInlineCreationRowsV4',
                pageName: page.targetName,
                parsedApp,
                configurationPath: appCreateMode.configurationPath,
                tableType,
                validValues,
                recommendedValue
            });
        }
        return;
    }

    // Suggest app level only once and only if all tables have the same recommended value
    if (
        shouldSuggestAppLevel &&
        !problems.some((p) => p.messageId === 'suggestAppLevelV4' && p.manifest.uri === parsedApp.manifest.manifestUri)
    ) {
        reportDiagnostic(problems, {
            messageId: 'suggestAppLevelV4',
            pageName: '',
            parsedApp,
            configurationPath: appCreateMode.configurationPath,
            tableType
        });
    }
}

/**
 * Processes all V2 applications in the project context.
 * Iterates through apps, pages, and tables to validate creation mode configuration.
 *
 * @param context - Rule context containing source code and project information
 * @param problems - Array to collect diagnostic problems
 */
function processV2Apps(
    context: RuleContext<{
        LangOptions: FioriLanguageOptions;
        Code: FioriSourceCode;
        RuleOptions: [];
        Node: Node;
        MessageIds: CreateModeMessageId;
    }>,
    problems: CreationModeForTable[]
): void {
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

            for (const table of page.lookup['table'] ?? []) {
                processTableV2(table, page, appCreateMode, parsedApp, problems);
            }
        }
    }
}

/**
 * Processes all V4 applications in the project context.
 * Iterates through apps, pages, and tables to validate creation mode configuration.
 *
 * @param context - Rule context containing source code and project information
 * @param problems - Array to collect diagnostic problems
 */
function processV4Apps(
    context: RuleContext<{
        LangOptions: FioriLanguageOptions;
        Code: FioriSourceCode;
        RuleOptions: [];
        Node: Node;
        MessageIds: CreateModeMessageId;
    }>,
    problems: CreationModeForTable[]
): void {
    for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
        if (app.type !== 'fe-v4') {
            continue;
        }
        const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
        const appCreateMode = app.configuration.createMode;

        // Collect all table types and their recommended values to determine if app-level suggestion is appropriate
        const recommendedValues = new Set<string>();
        for (const page of app.pages) {
            if (page.type !== 'object-page') {
                continue;
            }
            for (const table of page.lookup['table'] ?? []) {
                const tableType = table.configuration.tableType?.valueInFile ?? '';
                if (tableType !== 'AnalyticalTable') {
                    recommendedValues.add(getRecommendedValueV4(tableType));
                }
            }
        }

        // Only suggest app level if all tables have the same recommended value
        const shouldSuggestAppLevel = recommendedValues.size === 1;

        for (const page of app.pages) {
            if (page.type !== 'object-page') {
                continue;
            }

            for (const table of page.lookup['table'] ?? []) {
                processTableV4(table, page, appCreateMode, parsedApp, problems, shouldSuggestAppLevel);
            }
        }
    }
}

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
                'Invalid createMode value "{{value}}"{{tableType}}. Recommended value is "creationRows".{{validValues}}',
            recommendCreationRows: 'Consider using "creationRows" for better user experience instead of "{{value}}".',
            suggestAppLevel: 'Consider adding createMode at application level for better user experience.',
            analyticalTableNotSupported:
                'Creation mode is not supported for Analytical tables. Remove the createMode/creationMode property.',
            invalidCreateModeV4:
                'Invalid creationMode value "{{value}}"{{tableType}}. Recommended value is "{{recommendedValue}}".{{validValues}}',
            recommendInlineCreationRowsV4:
                'Consider using "{{recommendedValue}}" for better user experience instead of "{{value}}".',
            suggestAppLevelV4: 'Consider adding creationMode at application level for better user experience.'
        },
        fixable: 'code'
    },
    check(context) {
        const problems: CreationModeForTable[] = [];

        processV2Apps(context, problems);
        processV4Apps(context, problems);

        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, paths) =>
        function report(node: MemberNode): void {
            let tableType = '';
            if (diagnostic.tableType) {
                if (diagnostic.tableType === 'TreeTable') {
                    tableType = ' for Tree Table';
                } else if (diagnostic.tableType === 'GridTable') {
                    tableType = ' for Grid Table';
                } else {
                    tableType = ` for ${diagnostic.tableType}`;
                }
            }
            let value = String(node.value);
            if (node.value.type === 'String') {
                value = node.value.value;
            } else if (node.name.type === 'String') {
                value = node.name.value;
            }
            const operation = diagnostic.messageId === 'analyticalTableNotSupported' ? 'delete' : undefined;
            context.report({
                node,
                messageId: diagnostic.messageId,
                data: {
                    value,
                    tableType,
                    validValues:
                        diagnostic.validValues.length > 0
                            ? ` Valid values are: ${diagnostic.validValues.join(', ')}.`
                            : '',
                    recommendedValue: diagnostic.recommendedValue ?? ''
                },
                fix: createJsonFixer({
                    value: operation === 'delete' ? undefined : diagnostic.recommendedValue,
                    context,
                    deepestPathResult: paths,
                    node,
                    operation
                })
            });
        }
});

export default rule;
