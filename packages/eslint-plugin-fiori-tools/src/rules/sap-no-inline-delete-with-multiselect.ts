import type { FioriRuleDefinition } from '../types.js';
import { NO_INLINE_DELETE_WITH_MULTISELECT, type NoInlineDeleteWithMultiselect } from '../language/diagnostics.js';
import { createFioriRule } from '../language/rule-factory.js';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { ParsedApp } from '../project-context/parser/index.js';
import type { FeV2ListReport, FeV2ObjectPage, LinkedFeV2App, Table } from '../project-context/linker/fe-v2.js';
import { FioriJSONSourceCode } from '../language/json/source-code.js';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: NO_INLINE_DELETE_WITH_MULTISELECT,
    meta: {
        type: 'problem',
        docs: {
            recommended: true,
            description:
                'Ensures that inlineDelete and multiSelect are not both enabled in the same OData V2 table settings, as they are mutually exclusive and will cause the application to fail.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-inline-delete-with-multiselect.md'
        },
        messages: {
            [NO_INLINE_DELETE_WITH_MULTISELECT]:
                '"inlineDelete" and "multiSelect" cannot both be enabled in the same table settings.'
        }
    },

    check(context) {
        if (!(context.sourceCode instanceof FioriJSONSourceCode)) {
            return [];
        }
        const problems: NoInlineDeleteWithMultiselect[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v2') {
                continue;
            }
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            problems.push(...checkV2AppPages(app, parsedApp, context.sourceCode));
        }
        return problems;
    },

    createJsonVisitorHandler: (_context, _diagnostic, _deepestPathResult) =>
        function report(node: MemberNode): void {
            _context.report({
                node,
                messageId: NO_INLINE_DELETE_WITH_MULTISELECT
            });
        }
});

/**
 * Checks all pages in a V2 app for conflicting inlineDelete and multiSelect settings.
 *
 * @param app - The linked V2 app
 * @param parsedApp - The parsed app metadata
 * @param sourceCode - The Fiori JSON source code instance
 * @returns Array of diagnostics for conflicting settings
 */
function checkV2AppPages(
    app: LinkedFeV2App,
    parsedApp: ParsedApp,
    sourceCode: FioriJSONSourceCode
): NoInlineDeleteWithMultiselect[] {
    return app.pages.flatMap((page) => {
        if (page.type === 'list-report-page') {
            return checkV2ListReportPage(page, parsedApp, sourceCode);
        }
        if (page.type === 'object-page') {
            return checkV2ObjectPage(page, parsedApp, sourceCode);
        }
        return [];
    });
}

/**
 * Checks a V2 list-report page for conflicting inlineDelete and multiSelect in the table settings.
 *
 * @param page - The V2 list-report page
 * @param parsedApp - The parsed app metadata
 * @param sourceCode - The Fiori JSON source code instance
 * @returns Array of diagnostics for conflicting settings
 */
function checkV2ListReportPage(
    page: FeV2ListReport,
    parsedApp: ParsedApp,
    sourceCode: FioriJSONSourceCode
): NoInlineDeleteWithMultiselect[] {
    return checkTableSettings(page.lookup['table'] ?? [], page.targetName, parsedApp, sourceCode);
}

/**
 * Checks a V2 object page for conflicting inlineDelete and multiSelect settings.
 * Checks both the page-level tableSettings (applied to all section tables) and
 * individual section-level tableSettings.
 *
 * @param page - The V2 object page
 * @param parsedApp - The parsed app metadata
 * @param sourceCode - The Fiori JSON source code instance
 * @returns Array of diagnostics for conflicting settings
 */
function checkV2ObjectPage(
    page: FeV2ObjectPage,
    parsedApp: ParsedApp,
    sourceCode: FioriJSONSourceCode
): NoInlineDeleteWithMultiselect[] {
    const diagnostics: NoInlineDeleteWithMultiselect[] = [];

    if (page.configuration.inlineDelete.valueInFile === true && page.configuration.multiSelect.valueInFile === true) {
        const tableSettingsPath = page.configuration.inlineDelete.configurationPath.slice(0, -1);
        const node = sourceCode.getNode(sourceCode.ast.body, tableSettingsPath);
        diagnostics.push({
            type: NO_INLINE_DELETE_WITH_MULTISELECT,
            pageName: page.targetName,
            manifest: {
                uri: parsedApp.manifest.manifestUri,
                object: parsedApp.manifestObject,
                propertyPath: tableSettingsPath,
                loc: node.loc
            }
        });
    }

    diagnostics.push(...checkTableSettings(page.lookup['table'] ?? [], page.targetName, parsedApp, sourceCode));

    return diagnostics;
}

/**
 * Checks a list of tables for conflicting inlineDelete and multiSelect in their tableSettings.
 *
 * @param tables - Tables to check
 * @param pageName - Name of the owning page (used in the diagnostic)
 * @param parsedApp - The parsed app metadata
 * @param sourceCode - The Fiori JSON source code instance
 * @returns Array of diagnostics for conflicting settings
 */
function checkTableSettings(
    tables: Table[],
    pageName: string,
    parsedApp: ParsedApp,
    sourceCode: FioriJSONSourceCode
): NoInlineDeleteWithMultiselect[] {
    return tables.flatMap((table) => {
        if (
            table.configuration.inlineDelete.valueInFile !== true ||
            table.configuration.multiSelect.valueInFile !== true
        ) {
            return [];
        }
        const tableSettingsPath = table.configuration.inlineDelete.configurationPath.slice(0, -1);
        const node = sourceCode.getNode(sourceCode.ast.body, tableSettingsPath);
        return [
            {
                type: NO_INLINE_DELETE_WITH_MULTISELECT,
                pageName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: tableSettingsPath,
                    loc: node.loc
                }
            }
        ];
    });
}

export default rule;
