import type { FioriRuleDefinition } from '../types.js';
import { ENABLE_PASTE, type EnablePaste } from '../language/diagnostics.js';
import { createFioriRule } from '../language/rule-factory.js';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { ParsedApp } from '../project-context/parser/index.js';
import type { FeV4PageType, Table as TableV4 } from '../project-context/linker/fe-v4.js';
import { createJsonFixer } from '../language/rule-fixer.js';
import { FioriJSONSourceCode } from '../language/json/source-code.js';
import { checkAppTablesConfiguration, FLEX_CHANGE_NEW_VALUE_PATH_RESULT, isV2Table } from '../utils/helpers.js';
import type { FeV2PageType, Table as TableV2 } from '../project-context/linker/fe-v2.js';
import { FioriChangeSourceCode } from '../language/change/source-code.js';

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
        if (
            !(context.sourceCode instanceof FioriJSONSourceCode) &&
            !(context.sourceCode instanceof FioriChangeSourceCode)
        ) {
            return [];
        }
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
                problems.push(
                    ...(<EnablePaste[]>(
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
            context.report({
                node,
                messageId: ENABLE_PASTE,
                data: { sectionText: `${diagnostic.pageSectionName} ` },
                fix: createJsonFixer({
                    context,
                    deepestPathResult: FLEX_CHANGE_NEW_VALUE_PATH_RESULT,
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
    problems: EnablePaste[],
    pageSectionName?: string
): void {
    if (isV2Table(table)) {
        if (table.configuration.showPasteButton.valueInFile === false) {
            problems.push({
                type: ENABLE_PASTE,
                property: 'showPasteButton',
                pageName: page.targetName,
                pageSectionName,
                changeFileUri: table.configuration.showPasteButton.changeFileUri
            });
        }
    } else if (table.configuration.enablePaste.valueInFile === false && sourceCode instanceof FioriJSONSourceCode) {
        const node = sourceCode.getNode(sourceCode.ast.body, table.configuration.enablePaste.configurationPath);
        problems.push({
            type: ENABLE_PASTE,
            property: 'enablePaste',
            pageName: page.targetName,
            pageSectionName,
            manifest: {
                uri: parsedApp.manifest.manifestUri,
                object: parsedApp.manifestObject,
                propertyPath: table.configuration.enablePaste.configurationPath,
                loc: node.loc
            }
        });
    }
}

export default rule;
