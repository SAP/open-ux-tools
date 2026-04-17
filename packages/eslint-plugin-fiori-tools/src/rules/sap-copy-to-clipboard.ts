import type { FioriRuleDefinition } from '../types';
import { COPY_TO_CLIPBOARD, type CopyToClipboard } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { FeV2PageType, Table as TableV2 } from '../project-context/linker/fe-v2';
import type { ParsedApp } from '../project-context/parser';
import type { FeV4PageType, Table as TableV4 } from '../project-context/linker/fe-v4';
import { createJsonFixer } from '../language/rule-fixer';

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
        const problems: CopyToClipboard[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            for (const page of app.pages) {
                problems.push(...handleCopyInTable(app.type, page, parsedApp));
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
 * @param appType
 * @param page
 * @param parsedApp
 * @returns
 */
function handleCopyInTable(
    appType: 'fe-v4' | 'fe-v2',
    page: FeV4PageType | FeV2PageType,
    parsedApp: ParsedApp
): CopyToClipboard[] {
    const problems: CopyToClipboard[] = [];
    if (page.type === 'list-report-page') {
        for (const table of page.lookup['table'] ?? []) {
            checkConfiguration(appType, page, table, parsedApp, problems);
        }
    } else if (page.type === 'object-page') {
        for (const tableSection of page.sections.filter((section) => section.type === 'table-section')) {
            const table = tableSection.children.find((element) => element.type === 'table');
            if (table) {
                checkConfiguration(appType, page, table, parsedApp, problems, tableSection.annotation?.label);
            }
        }
    }
    return problems;
}

/**
 *
 * @param appType
 * @param page
 * @param table
 * @param parsedApp
 * @param problems
 * @param pageSectionName
 */
function checkConfiguration(
    appType: 'fe-v4' | 'fe-v2',
    page: FeV4PageType | FeV2PageType,
    table: TableV4 | TableV2,
    parsedApp: ParsedApp,
    problems: CopyToClipboard[],
    pageSectionName?: string
): void {
    let config;
    let wrongValue = false;
    if (appType === 'fe-v2') {
        config = (table as TableV2).configuration.copy;
    } else if (appType === 'fe-v4') {
        config = (table as TableV4).configuration.disableCopyToClipboard;
        wrongValue = true;
    }
    if (config?.valueInFile === wrongValue) {
        const copyIssue: CopyToClipboard | undefined = {
            type: COPY_TO_CLIPBOARD,
            pageName: page.targetName,
            pageSectionName,
            manifest: {
                uri: parsedApp.manifest.manifestUri,
                object: parsedApp.manifestObject,
                propertyPath: config.configurationPath
            }
        };
        if (copyIssue) {
            problems.push(copyIssue);
        }
    }
}

export default rule;
