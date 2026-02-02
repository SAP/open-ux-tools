import type { FioriRuleDefinition } from '../types';
import { ENABLE_EXPORT, type EnableExport } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { ParsedApp } from '../project-context/parser';
import type { FeV4PageType } from '../project-context/linker/fe-v4';
import { createJsonFixer } from '../language/rule-fixer';

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
            [ENABLE_EXPORT]: 'Export functionality in the table must be enabled'
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
            if (app.type === 'fe-v4') {
                for (const page of app.pages) {
                    problems.push(...handleExportInTableV4(page, parsedApp));
                }
            }
        }
        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: ENABLE_EXPORT,
                fix: createJsonFixer({
                    context,
                    deepestPathResult,
                    node,
                    operation: 'delete'
                })
            });
        }
});

/**
 * Looks through V4 app page tables and returns problems if enableExport is set to false.
 *
 * @param page - V4 app page
 * @param parsedApp - parsed V4 app
 * @returns - EnableExport issues
 */
function handleExportInTableV4(page: FeV4PageType, parsedApp: ParsedApp): EnableExport[] {
    const problems: EnableExport[] = [];
    for (const table of page.lookup['table'] ?? []) {
        if (table.configuration.enableExport.valueInFile === false) {
            problems.push({
                type: ENABLE_EXPORT,
                pageName: page.targetName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: table.configuration.enableExport.configurationPath
                }
            });
        }
    }
    return problems;
}

export default rule;
