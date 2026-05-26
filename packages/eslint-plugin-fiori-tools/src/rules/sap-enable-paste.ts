import type { FioriRuleDefinition } from '../types';
import { ENABLE_PASTE, type EnablePaste } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { ParsedApp } from '../project-context/parser';
import type { FeV4PageType, Table as TableV4 } from '../project-context/linker/fe-v4';
import { createJsonFixer } from '../language/rule-fixer';
import { checkAppTablesConfiguration } from '../utils/helpers';
import type { FeV2PageType, Table as TableV2 } from '../project-context/linker/fe-v2';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: ENABLE_PASTE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Sets whether to enable or disable the "Paste" button in tables',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-enable-paste.md'
        },
        messages: {
            [ENABLE_PASTE]: 'Paste functionality in the {{sectionText}}table must be enabled'
        },
        fixable: 'code'
    },

    check(context) {
        const problems: EnablePaste[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            for (const page of app.pages) {
                if (page.type !== 'object-page') {
                    continue;
                }
                problems.push(...(<EnablePaste[]>checkAppTablesConfiguration(page, parsedApp, checkConfiguration)));
            }
        }
        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: ENABLE_PASTE,
                data: { sectionText: `${diagnostic.pageSectionName} ` },
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
                messageId: ENABLE_PASTE,
                data: { sectionText: `${diagnostic.pageSectionName} ` },
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
 * Checks if given table is ODataV2 type.
 *
 * @param table
 * @returns
 */
function isV2Table(table: TableV2 | TableV4): table is TableV2 {
    return 'showPasteButton' in (table as TableV2).configuration;
}

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
    problems: EnablePaste[],
    pageSectionName?: string
): void {
    if (isV2Table(table)) {
        if (table.configuration.showPasteButton.valueInFile === false) {
            problems.push({
                type: ENABLE_PASTE,
                pageName: page.targetName,
                pageSectionName,
                changeFileUri: table.configuration.showPasteButton.changeFileUri
            });
        }
    } else if (table.configuration.enablePaste.valueInFile === false) {
        problems.push({
            type: ENABLE_PASTE,
            pageName: page.targetName,
            pageSectionName,
            manifest: {
                uri: parsedApp.manifest.manifestUri,
                object: parsedApp.manifestObject,
                propertyPath: table.configuration.enablePaste.configurationPath
            }
        });
    }
}

export default rule;
