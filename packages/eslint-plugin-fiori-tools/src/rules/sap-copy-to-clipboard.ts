import type { FioriRuleDefinition } from '../types.js';
import { COPY_TO_CLIPBOARD, type CopyToClipboard } from '../language/diagnostics.js';
import { createFioriRule } from '../language/rule-factory.js';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { FeV2PageType, Table as TableV2 } from '../project-context/linker/fe-v2.js';
import type { ParsedApp } from '../project-context/parser/index.js';
import type { FeV4PageType, Table as TableV4 } from '../project-context/linker/fe-v4.js';
import { createJsonFixer } from '../language/rule-fixer.js';
import { checkAppTablesConfiguration } from '../utils/helpers.js';
import { FioriJSONSourceCode } from '../language/json/source-code.js';
import type { FioriSourceCode } from '../language/fiori-language.js';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: COPY_TO_CLIPBOARD,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Sets whether to enable or disable the copy to clipboard button in tables',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-copy-to-clipboard.md'
        },
        messages: {
            [COPY_TO_CLIPBOARD]:
                'Copy To Clipboard in the {{sectionText}}table must be correctly configured. If not set, the "Copy" button is displayed'
        },
        fixable: 'code'
    },

    check(context) {
        if (!(context.sourceCode instanceof FioriJSONSourceCode)) {
            return [];
        }
        const problems: CopyToClipboard[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            for (const page of app.pages) {
                problems.push(
                    ...(<CopyToClipboard[]>(
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
                messageId: COPY_TO_CLIPBOARD,
                data: {
                    sectionText: diagnostic.pageSectionName ? `${diagnostic.pageSectionName} ` : ''
                },
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
 *
 * @param table
 * @returns
 */
function isV2Table(table: TableV2 | TableV4): table is TableV2 {
    return 'copy' in (table as TableV2).configuration;
}

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
    sourceCode: FioriSourceCode,
    problems: CopyToClipboard[],
    pageSectionName?: string
): void {
    let config;
    let wrongValue = false;
    if (isV2Table(table)) {
        config = table.configuration.copy;
    } else {
        config = table.configuration.disableCopyToClipboard;
        wrongValue = true;
    }
    if (config?.valueInFile === wrongValue) {
        const node =
            sourceCode instanceof FioriJSONSourceCode
                ? sourceCode.getNode(sourceCode.ast.body, config.configurationPath)
                : undefined;
        const copyIssue: CopyToClipboard | undefined = {
            type: COPY_TO_CLIPBOARD,
            pageName: page.targetName,
            pageSectionName,
            manifest: {
                uri: parsedApp.manifest.manifestUri,
                object: parsedApp.manifestObject,
                propertyPath: config.configurationPath,
                loc: node?.loc
            }
        };
        problems.push(copyIssue);
    }
}

export default rule;
