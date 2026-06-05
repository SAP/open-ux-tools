import type { MemberNode } from '@humanwhocodes/momoa';
import type { RuleContext } from '@eslint/core';

import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { CreateModeMessageId, CreationModeForTable } from '../language/diagnostics.js';
import { CREATION_MODE_FOR_TABLE } from '../language/diagnostics.js';
import type { ParsedApp } from '../project-context/parser/index.js';
import type { FioriLanguageOptions, FioriSourceCode, Node } from '../language/fiori-language.js';
import type { Table as V2Table, FeV2ObjectPage } from '../project-context/linker/fe-v2.js';
import type { Table as V4Table, LinkedFeV4App } from '../project-context/linker/fe-v4.js';
import { createJsonFixer } from '../language/rule-fixer.js';
import { FioriJSONSourceCode } from '../language/json/source-code.js';

const RECOMMENDED_MODE_V2 = 'creationRows';
const RECOMMENDED_MODE_V4_RESPONSIVE_GRID = 'InlineCreationRows';
const RECOMMENDED_MODE_V4_TREE = 'Inline';

interface CreateModeConfig {
    valueInFile?: string;
    values: string[];
    configurationPath: string[];
}

/**
 * Reports a diagnostic issue related to the creation mode configuration.
 *
 * @param problems - Array to collect diagnostic problems
 * @param sourceCode - FioriJSONSourceCode instance
 * @param options - Diagnostic options
 * @param options.messageId - The message identifier for the diagnostic
 * @param options.pageName - Name of the page where the issue occurs
 * @param options.pageSectionName - Name of the object page section where the issue occurs
 * @param options.parsedApp - Parsed application context
 * @param options.configurationPath - Path to the configuration in manifest
 * @param options.tableType - Type of table (for example, 'GridTable' or 'ResponsiveTable')
 * @param options.validValues - Valid values for the configuration
 * @param options.recommendedValue - Recommended value for the configuration
 */
function reportDiagnostic(
    problems: CreationModeForTable[],
    sourceCode: FioriJSONSourceCode,
    {
        messageId,
        pageName,
        pageSectionName,
        parsedApp,
        configurationPath,
        tableType,
        validValues = [],
        recommendedValue
    }: {
        messageId: CreateModeMessageId;
        pageName: string;
        pageSectionName?: string;
        parsedApp: ParsedApp;
        configurationPath: string[];
        tableType: string;
        validValues?: string[];
        recommendedValue?: string;
    }
): void {
    const node =
        sourceCode instanceof FioriJSONSourceCode
            ? sourceCode.getNode(sourceCode.ast.body, configurationPath)
            : undefined;
    problems.push({
        type: CREATION_MODE_FOR_TABLE,
        messageId,
        pageName,
        pageSectionName,
        tableType,
        validValues,
        recommendedValue,
        manifest: {
            uri: parsedApp.manifest.manifestUri,
            object: parsedApp.manifestObject,
            propertyPath: configurationPath,
            loc: node ? node.loc : sourceCode.ast.body.loc
        }
    });
}

/**
 * Checks if an analytical table has createMode configured at any level in OData V2 applications.
 * Analytical tables do not support creation mode and this function reports diagnostics, if configured.
 *
 * @param tableType - Type of the table
 * @param createMode - Create mode configuration on different levels
 * @param createMode.sectionCreateMode - Create mode configuration at the section level
 * @param createMode.pageCreateMode - Create mode configuration at the page level
 * @param createMode.appCreateMode - Create mode configuration at the application level
 * @param pageName - Name of the page
 * @param parsedApp - Parsed application context
 * @param problems - Array to collect diagnostic problems
 * @param sourceCode
 * @returns True, if an analytical table issue was found and reported. Otherwise, false
 */
function checkAnalyticalTableV2(
    tableType: string,
    createMode: {
        sectionCreateMode: CreateModeConfig;
        pageCreateMode: CreateModeConfig;
        appCreateMode: CreateModeConfig;
    },
    pageName: string,
    parsedApp: ParsedApp,
    problems: CreationModeForTable[],
    sourceCode: FioriJSONSourceCode
): boolean {
    if (tableType !== 'AnalyticalTable') {
        return false;
    }

    if (createMode.sectionCreateMode.valueInFile) {
        reportDiagnostic(problems, sourceCode, {
            messageId: 'analyticalTableNotSupported',
            pageName,
            parsedApp,
            configurationPath: createMode.sectionCreateMode.configurationPath,
            tableType
        });
        return true;
    }
    if (createMode.pageCreateMode.valueInFile) {
        reportDiagnostic(problems, sourceCode, {
            messageId: 'analyticalTableNotSupported',
            pageName,
            parsedApp,
            configurationPath: createMode.pageCreateMode.configurationPath,
            tableType
        });
        return true;
    }
    // table type is AnalyticalTable, but there is not creation mode configured - is valid.
    return false;
}

/**
 * Validates the create mode configuration for OData V2 applications.
 * Checks if the value is valid and recommends a value according to best practice.
 *
 * @param createMode - Create mode configuration to validate
 * @param pageName - Name of the page
 * @param parsedApp - Parsed application context
 * @param tableType - Type of the table
 * @param problems - Array to collect diagnostic problems
 * @param sourceCode - FioriJSONSourceCode instance
 * @param pageSectionName - Name of the object page section where the issue occurs
 * @returns True, if a configuration is found and an issue reported. False, if no configuration exists
 */
function validateCreateModeV2(
    createMode: CreateModeConfig,
    pageName: string,
    parsedApp: ParsedApp,
    tableType: string,
    problems: CreationModeForTable[],
    sourceCode: FioriJSONSourceCode,
    pageSectionName?: string
): boolean {
    if (!createMode.valueInFile) {
        return false;
    }

    if (!createMode.values.includes(createMode.valueInFile)) {
        reportDiagnostic(problems, sourceCode, {
            messageId: 'invalidCreateMode',
            pageName,
            parsedApp,
            configurationPath: createMode.configurationPath,
            tableType,
            validValues: createMode.values,
            recommendedValue: RECOMMENDED_MODE_V2,
            pageSectionName
        });
        return true;
    }

    if (createMode.valueInFile !== RECOMMENDED_MODE_V2) {
        reportDiagnostic(problems, sourceCode, {
            messageId: 'recommendCreationRows',
            pageName,
            parsedApp,
            configurationPath: createMode.configurationPath,
            tableType,
            recommendedValue: RECOMMENDED_MODE_V2,
            pageSectionName
        });
    }
    return true;
}

/**
 * Processes a single table in a OData V2 application.
 * Validates create mode at the section, page, and application levels with the correct priority.
 *
 * @param table - The table node to process
 * @param page - The object page containing the table
 * @param appCreateMode - Application-level create mode configuration
 * @param parsedApp - Parsed application context
 * @param problems - Array to collect diagnostic problems
 * @param sourceCode - FioriJSONSourceCode instance
 * @param pageSectionName - Name of the object page section where the issue occurs
 */
function processTableV2(
    table: V2Table,
    page: FeV2ObjectPage,
    appCreateMode: CreateModeConfig,
    parsedApp: ParsedApp,
    problems: CreationModeForTable[],
    sourceCode: FioriJSONSourceCode,
    pageSectionName?: string
): void {
    const sectionCreateMode = table.configuration.createMode;
    const pageCreateMode = page.configuration.createMode;
    const tableType = table.configuration.tableType?.valueInFile ?? '';

    // Check analytical table
    if (
        checkAnalyticalTableV2(
            tableType,
            { sectionCreateMode, pageCreateMode, appCreateMode },
            page.targetName,
            parsedApp,
            problems,
            sourceCode
        )
    ) {
        return;
    }

    // Check section, page, then app level
    if (
        validateCreateModeV2(
            sectionCreateMode,
            page.targetName,
            parsedApp,
            tableType,
            problems,
            sourceCode,
            pageSectionName
        )
    ) {
        return;
    }
    if (validateCreateModeV2(pageCreateMode, page.targetName, parsedApp, tableType, problems, sourceCode)) {
        return;
    }
    if (validateCreateModeV2(appCreateMode, page.targetName, parsedApp, tableType, problems, sourceCode)) {
        return;
    }

    // Suggest app level only once
    if (!problems.some((p) => p.messageId === 'suggestAppLevel' && p.manifest.uri === parsedApp.manifest.manifestUri)) {
        reportDiagnostic(problems, sourceCode, {
            messageId: 'suggestAppLevel',
            pageName: '',
            parsedApp,
            configurationPath: appCreateMode.configurationPath,
            tableType,
            recommendedValue: RECOMMENDED_MODE_V2
        });
    }
}

/**
 * Checks if an analytical table has creationMode configured at any level in OData V4 applications.
 * Analytical tables do not support creation mode and this function reports diagnostics, if configured.
 *
 * @param tableType - Type of the table
 * @param tableCreationMode - Creation mode configuration at the table level
 * @param appCreateMode - Create mode configuration at the application level
 * @param pageName - Name of the page
 * @param parsedApp - Parsed application context
 * @param problems - Array to collect diagnostic problems
 * @param sourceCode
 * @returns True, if an analytical table issue was found and reported. Otherwise, false
 */
function checkAnalyticalTableV4(
    tableType: string,
    tableCreationMode: CreateModeConfig,
    appCreateMode: CreateModeConfig,
    pageName: string,
    parsedApp: ParsedApp,
    problems: CreationModeForTable[],
    sourceCode: FioriJSONSourceCode
): boolean {
    if (tableType !== 'AnalyticalTable') {
        return false;
    }

    if (tableCreationMode.valueInFile) {
        // Remove 'name' segment to delete the entire creationMode object
        const pathWithoutName = tableCreationMode.configurationPath.slice(0, -1);
        reportDiagnostic(problems, sourceCode, {
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
 * Gets the recommended creation mode value based on the table type for OData V4 applications.
 *
 * @param tableType - Type of the table
 * @returns 'Inline' for TreeTable and 'InlineCreationRows' for other table types
 */
function getRecommendedValueV4(tableType: string): string {
    return tableType === 'TreeTable' ? RECOMMENDED_MODE_V4_TREE : RECOMMENDED_MODE_V4_RESPONSIVE_GRID;
}

/**
 * Validates the creation mode configuration for OData V4 applications.
 * Checks if the value is valid and recommends a value based on best practices and the table type.
 *
 * @param creationMode - Creation mode configuration to validate
 * @param page - page information
 * @param page.name - Name of the page
 * @param page.sectionName - Name of the object page section
 * @param parsedApp - Parsed application context
 * @param tableType - Type of the table
 * @param recommended - Suggested value recommendation
 * @param recommended.value - The recommended value for this table type
 * @param recommended.suggestAppLevel - Whether to report on page level or not based on app level suggestion
 * @param problems - Array to collect diagnostic problems
 * @param sourceCode
 * @returns True, if a configuration was found and issue was reported. False, if no configuration exists
 */
function validateCreationModeV4(
    creationMode: CreateModeConfig,
    page: { name: string; sectionName?: string },
    parsedApp: ParsedApp,
    tableType: string,
    recommended: { value: string; suggestAppLevel: boolean },
    problems: CreationModeForTable[],
    sourceCode: FioriJSONSourceCode
): boolean {
    const value = creationMode.valueInFile;
    if (value === undefined && recommended.suggestAppLevel === true) {
        return false;
    }
    const validValues = creationMode.values;
    const recommendedValue = recommended.value;
    // If recommended.suggestAppLevel is false, we MUST report on page level. (missing configuration)
    if (!value) {
        reportDiagnostic(problems, sourceCode, {
            messageId: 'invalidCreateModeV4',
            pageName: page.name,
            parsedApp,
            configurationPath: creationMode.configurationPath,
            tableType,
            validValues,
            recommendedValue,
            pageSectionName: page.sectionName
        });
        return true;
    }

    if (!validValues.includes(value)) {
        reportDiagnostic(problems, sourceCode, {
            messageId: 'invalidCreateModeV4',
            pageName: page.name,
            parsedApp,
            configurationPath: creationMode.configurationPath,
            tableType,
            validValues,
            recommendedValue,
            pageSectionName: page.sectionName
        });
        return true;
    }

    if (value !== recommendedValue) {
        reportDiagnostic(problems, sourceCode, {
            messageId: 'recommendInlineCreationRowsV4',
            pageName: page.name,
            parsedApp,
            configurationPath: creationMode.configurationPath,
            tableType,
            validValues,
            recommendedValue,
            pageSectionName: page.sectionName
        });
    }
    return true;
}

/**
 * Processes a single table in a OData V4 application.
 * Validates creation mode at the table and application levels with the correct priority.
 * Different table types have different recommended values.
 *
 * @param table - The table node to process
 * @param page - Page information
 * @param page.targetName - The page name
 * @param page.sectionName - Name of the object page section where the issue occurs
 * @param appCreateMode - Application-level create mode configuration
 * @param parsedApp - Parsed application context
 * @param problems - Array to collect diagnostic problems
 * @param shouldSuggestAppLevel - Whether to suggest app-level configuration (only if all tables have same recommended value)
 * @param sourceCode - FioriJSONSourceCode instance
 */
function processTableV4(
    table: V4Table,
    page: { targetName: string; sectionName?: string },
    appCreateMode: CreateModeConfig,
    parsedApp: ParsedApp,
    problems: CreationModeForTable[],
    shouldSuggestAppLevel: boolean,
    sourceCode: FioriJSONSourceCode
): void {
    const tableCreationMode = table.configuration.creationMode;
    const tableType = table.configuration.tableType?.valueInFile ?? '';

    // Check analytical table
    if (
        checkAnalyticalTableV4(
            tableType,
            tableCreationMode,
            appCreateMode,
            page.targetName,
            parsedApp,
            problems,
            sourceCode
        )
    ) {
        return;
    }

    const recommendedValue = getRecommendedValueV4(tableType);

    // Check table level
    if (
        validateCreationModeV4(
            tableCreationMode,
            { name: page.targetName, sectionName: page.sectionName },
            parsedApp,
            tableType,
            { value: recommendedValue, suggestAppLevel: shouldSuggestAppLevel },
            problems,
            sourceCode
        )
    ) {
        return;
    }

    // Check app level
    if (appCreateMode.valueInFile) {
        const validValues = appCreateMode.values;
        if (!validValues.includes(appCreateMode.valueInFile)) {
            reportDiagnostic(problems, sourceCode, {
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
            reportDiagnostic(problems, sourceCode, {
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
        reportDiagnostic(problems, sourceCode, {
            messageId: 'suggestAppLevelV4',
            pageName: '',
            parsedApp,
            configurationPath: appCreateMode.configurationPath,
            tableType,
            recommendedValue
        });
    }
}

/**
 * Processes all OData V2 applications in the project context.
 * Iterates through apps, pages, and tables to validate the creation mode configuration.
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
    if (!(context.sourceCode instanceof FioriJSONSourceCode)) {
        return;
    }
    for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
        if (app.type !== 'fe-v2') {
            continue;
        }
        const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
        const appCreateMode = app.configuration.createMode;

        for (const page of app.pages.filter((page) => page.type === 'object-page')) {
            for (const tableSection of page.sections.filter((section) => section.type === 'table-section')) {
                const table = tableSection.children.find((element) => element.type === 'table');
                if (table) {
                    processTableV2(
                        table,
                        page,
                        appCreateMode,
                        parsedApp,
                        problems,
                        context.sourceCode,
                        tableSection.annotation?.label
                    );
                }
            }
        }
    }
}

/**
 * Determines if app-level creation mode suggestion is appropriate for V4 applications.
 * App-level suggestion is only made when all tables have the same recommended value,
 * or when there are only ResponsiveTable and GridTable types (which share the same recommended value).
 *
 * @param app - The linked application to analyze
 * @returns True if app-level suggestion should be made, false otherwise
 */
function shouldSuggestAppLevelV4(app: LinkedFeV4App): boolean {
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

    // Only suggest app level if all tables have the same recommended value or if the size is two and values are 'ResponsiveTable' and 'GridTable'
    return (
        recommendedValues.size === 1 ||
        (recommendedValues.size === 2 && recommendedValues.has('ResponsiveTable') && recommendedValues.has('GridTable'))
    );
}
/**
 * Processes all V4 applications in the project context.
 * Iterates through apps, pages, and tables to validate creation mode configuration.
 * Processes all OData V4 applications in the project context.
 * Iterates through apps, pages, and tables to validate the creation mode configuration.
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
    if (!(context.sourceCode instanceof FioriJSONSourceCode)) {
        return;
    }
    for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
        if (app.type !== 'fe-v4') {
            continue;
        }
        const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
        const appCreateMode = app.configuration.createMode;
        const shouldSuggestAppLevel = shouldSuggestAppLevelV4(app);
        for (const page of app.pages.filter((page) => page.type === 'object-page')) {
            for (const tableSection of page.sections.filter((section) => section.type === 'table-section')) {
                const table = tableSection.children.find((element) => element.type === 'table');
                if (table) {
                    processTableV4(
                        table,
                        { targetName: page.targetName, sectionName: tableSection.annotation?.label },
                        appCreateMode,
                        parsedApp,
                        problems,
                        shouldSuggestAppLevel,
                        context.sourceCode
                    );
                }
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
                'Ensure proper creationMode configuration for tables in SAP Fiori elements V2 and V4 applications',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-creation-mode-for-table.md'
        },
        messages: {
            invalidCreateMode:
                'Invalid createMode value: "{{value}}"{{tableType}}{{sectionText}}. The recommended value is "creationRows".{{validValues}}',
            recommendCreationRows: 'Consider using "creationRows" for a better user experience instead of "{{value}}".',
            suggestAppLevel: 'Consider adding createMode at the application level for a better user experience.',
            analyticalTableNotSupported:
                'Creation mode is not supported for analytical tables. Remove the createMode or creationMode property.',
            invalidCreateModeV4:
                'Invalid creationMode value "{{value}}"{{tableType}}{{sectionText}}. The recommended value is "{{recommendedValue}}".{{validValues}}',
            recommendInlineCreationRowsV4:
                'Consider using "{{recommendedValue}}" for a better user experience instead of "{{value}}".',
            suggestAppLevelV4: 'Consider adding creationMode at the application level for better user experience.'
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
                    recommendedValue: diagnostic.recommendedValue ?? '',
                    sectionText: diagnostic.pageSectionName ? ` in ${diagnostic.pageSectionName} section` : ''
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
