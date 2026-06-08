import type { FioriRuleDefinition } from '../types.js';
import { ENABLE_EXPORT, type EnableExport } from '../language/diagnostics.js';
import { createFioriRule } from '../language/rule-factory.js';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { ParsedApp } from '../project-context/parser/index.js';
import type { FeV4PageType, Table as TableV4 } from '../project-context/linker/fe-v4.js';
import { createJsonFixer } from '../language/rule-fixer.js';
import { FioriJSONSourceCode } from '../language/json/source-code.js';
import { checkAppTablesConfiguration, isV2Table } from '../utils/helpers.js';
import type { FeV2PageType, Table as TableV2 } from '../project-context/linker/fe-v2.js';
import { FioriChangeSourceCode } from '../language/change/source-code.js';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: ENABLE_EXPORT,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Sets whether to enable or disable the "Export" button in tables',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-enable-export.md'
        },
        messages: {
            [ENABLE_EXPORT]: 'Export functionality in the {{sectionText}}table must be enabled'
        },
        fixable: 'code'
    },

    check(context) {
        if (
            !(context.sourceCode instanceof FioriJSONSourceCode) &&
            !(context.sourceCode instanceof FioriChangeSourceCode)
        ) {
            return [];
        }
        const problems: EnableExport[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            for (const page of app.pages) {
                problems.push(
                    ...(<EnableExport[]>(
                        checkAppTablesConfiguration(page, parsedApp, context.sourceCode, checkConfiguration)
                    ))
                );
            }
        }
        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: ENABLE_EXPORT,
                data: { sectionText: diagnostic.pageSectionName ? `${diagnostic.pageSectionName} ` : '' },
                fix: createJsonFixer({
                    context,
                    deepestPathResult,
                    node,
                    operation: 'delete'
                })
            });
        },
    createChangeVisitorHandler(context, diagnostic) {
        return function report(node: MemberNode): void {
            const deepestPathResult = { validatedPath: ['content', 'newValue'], missingSegments: [] };
            context.report({
                node,
                messageId: ENABLE_EXPORT,
                data: { sectionText: diagnostic.pageSectionName ? `${diagnostic.pageSectionName} ` : '' },
                fix: createJsonFixer({
                    context,
                    deepestPathResult,
                    node,
                    operation: 'update',
                    value: true
                })
            });
        };
    }
});

/**
 *
 * @param page
 * @param table
 * @param parsedApp
 * @param sourceCode
 * @param problems
 * @param pageSectionName
 */
function checkConfiguration(
    page: FeV4PageType | FeV2PageType,
    table: TableV4 | TableV2,
    parsedApp: ParsedApp,
    sourceCode: FioriJSONSourceCode | FioriChangeSourceCode,
    problems: EnableExport[],
    pageSectionName?: string
): void {
    if (table.configuration.enableExport.valueInFile === false) {
        if (isV2Table(table)) {
            problems.push({
                type: ENABLE_EXPORT,
                property: 'enableExport',
                pageName: page.targetName,
                pageSectionName,
                changeFileUri: table.configuration.enableExport.changeFileUri
            });
        } else if (sourceCode instanceof FioriJSONSourceCode) {
            const node = sourceCode.getNode(sourceCode.ast.body, table.configuration.enableExport.configurationPath);
            problems.push({
                type: ENABLE_EXPORT,
                property: 'enableExport',
                pageName: page.targetName,
                pageSectionName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: table.configuration.enableExport.configurationPath,
                    loc: node.loc
                }
            });
        }
    }
}
export default rule;
