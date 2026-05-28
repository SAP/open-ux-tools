import type { FioriRuleDefinition } from '../types';
import { ENABLE_EXPORT, type EnableExport } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { ParsedApp } from '../project-context/parser';
import type { FeV4PageType, Table as TableV4 } from '../project-context/linker/fe-v4';
import { createJsonFixer } from '../language/rule-fixer';
import { checkAppTablesConfiguration } from '../utils/helpers';
import type { FeV2PageType, Table as TableV2 } from '../project-context/linker/fe-v2';

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
        const problems: EnableExport[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            for (const page of app.pages) {
                problems.push(...(<EnableExport[]>checkAppTablesConfiguration(page, parsedApp, checkConfiguration)));
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
 * @param problems
 * @param pageSectionName
 */
function checkConfiguration(
    page: FeV4PageType | FeV2PageType,
    table: TableV4 | TableV2,
    parsedApp: ParsedApp,
    problems: EnableExport[],
    pageSectionName?: string
): void {
    if (table.configuration.enableExport.valueInFile === false) {
        const service = Object.values(parsedApp.services)[0]; // Assume 1 service only
        if (!service) {
            return;
        }
        if (service.config.version === '2.0') {
            problems.push({
                type: ENABLE_EXPORT,
                property: 'enableExport',
                pageName: page.targetName,
                pageSectionName,
                changeFileUri: table.configuration.enableExport.changeFileUri
            });
        } else if (service.config.version === '4.0') {
            problems.push({
                type: ENABLE_EXPORT,
                property: 'enableExport',
                pageName: page.targetName,
                pageSectionName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: table.configuration.enableExport.configurationPath
                },
                changeFileUri: table.configuration.enableExport.changeFileUri
            });
        }
    }
}
export default rule;
