import type { FioriRuleDefinition } from '../types';
import { CONDENSED_TABLE_LAYOUT, type CondensedTableLayout } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { ParsedApp } from '../project-context/parser';
import type { FeV2PageType } from '../project-context/linker/fe-v2';
import type { FeV4PageType, Table, OrphanTable } from '../project-context/linker/fe-v4';
import { createJsonFixer } from '../language/rule-fixer';

const COMPACT_TABLE_TYPES = ['GridTable', 'AnalyticalTable', 'TreeTable'];

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: CONDENSED_TABLE_LAYOUT,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'Requires condensedTableLayout to be enabled when using Grid Table, Analytical Table, or Tree Table',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-condensed-table-layout.md'
        },
        messages: {
            [CONDENSED_TABLE_LAYOUT]:
                '"condensedTableLayout" must be set to true when using GridTable, AnalyticalTable, or TreeTable'
        },
        fixable: 'code'
    },

    check(context) {
        const problems: CondensedTableLayout[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            if (app.type === 'fe-v4') {
                for (const page of app.pages) {
                    if (page.type !== 'list-report-page') {
                        continue;
                    }
                    problems.push(...checkCondensedTableLayoutV4(page, parsedApp));
                }
            } else if (app.type === 'fe-v2') {
                for (const page of app.pages) {
                    if (page.type === 'list-report-page') {
                        problems.push(...checkCondensedTableLayoutV2(page, parsedApp));
                    }
                }
            }
        }
        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: CONDENSED_TABLE_LAYOUT,
                fix: createJsonFixer({
                    context,
                    deepestPathResult,
                    node,
                    value: true
                })
            });
        }
});

/**
 * Checks V4 page tables and returns problems if a compact table type is used without condensedTableLayout.
 *
 * @param page - V4 app page
 * @param parsedApp - parsed V4 app
 * @returns - CondensedTableLayout issues
 */
function checkCondensedTableLayoutV4(page: FeV4PageType, parsedApp: ParsedApp): CondensedTableLayout[] {
    const problems: CondensedTableLayout[] = [];
    for (const table of (page.lookup['table'] ?? []) as (Table | OrphanTable)[]) {
        const tableType = table.configuration.tableType.valueInFile;
        if (!tableType || !COMPACT_TABLE_TYPES.includes(tableType)) {
            continue;
        }
        if (table.configuration.condensedTableLayout.valueInFile !== true) {
            problems.push({
                type: CONDENSED_TABLE_LAYOUT,
                pageName: page.targetName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: table.configuration.condensedTableLayout.configurationPath
                }
            });
        }
    }
    return problems;
}

/**
 * Checks V2 list report page and returns problems if a compact table type is used without condensedTableLayout.
 *
 * @param page - V2 list report page
 * @param parsedApp - parsed V2 app
 * @returns - CondensedTableLayout issues
 */
function checkCondensedTableLayoutV2(
    page: Extract<FeV2PageType, { type: 'list-report-page' }>,
    parsedApp: ParsedApp
): CondensedTableLayout[] {
    const hasCompactTable = (page.lookup['table'] ?? []).some((table) =>
        COMPACT_TABLE_TYPES.includes(table.configuration.tableType.valueInFile ?? '')
    );
    if (!hasCompactTable) {
        return [];
    }
    if (page.configuration.condensedTableLayout.valueInFile === true) {
        return [];
    }
    return [
        {
            type: CONDENSED_TABLE_LAYOUT,
            pageName: page.targetName,
            manifest: {
                uri: parsedApp.manifest.manifestUri,
                object: parsedApp.manifestObject,
                propertyPath: page.configuration.condensedTableLayout.configurationPath
            }
        }
    ];
}

export default rule;
