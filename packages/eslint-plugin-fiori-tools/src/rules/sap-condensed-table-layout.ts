import type { FioriRuleDefinition } from '../types';
import { CONDENSED_TABLE_LAYOUT, type CondensedTableLayout } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { ParsedApp } from '../project-context/parser';
import type { FeV2PageType, LinkedFeV2App } from '../project-context/linker/fe-v2';
import type { FeV4PageType, LinkedFeV4App, Table, OrphanTable } from '../project-context/linker/fe-v4';
import { createJsonFixer } from '../language/rule-fixer';

const COMPACT_TABLE_TYPES = new Set(['GridTable', 'AnalyticalTable', 'TreeTable']);

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: CONDENSED_TABLE_LAYOUT,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'Requires condensedTableLayout to be enabled when using a grid table, analytical table, or tree table.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-condensed-table-layout.md'
        },
        messages: {
            [CONDENSED_TABLE_LAYOUT]:
                '"condensedTableLayout" must be set to true when using a grid table, analytical table, or tree table.'
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
            if (app.type === 'fe-v4' || app.type === 'fe-v2') {
                problems.push(...checkCondensedTableLayoutForApp(app, parsedApp));
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
 * Checks all list-report pages of an app and returns condensed table layout problems.
 *
 * @param app - linked V4 or V2 app
 * @param parsedApp - parsed app
 * @returns - CondensedTableLayout issues
 */
function checkCondensedTableLayoutForApp(
    app: LinkedFeV4App | LinkedFeV2App,
    parsedApp: ParsedApp
): CondensedTableLayout[] {
    if (app.type === 'fe-v4') {
        return app.pages.flatMap((page) =>
            page.type === 'list-report-page' ? checkCondensedTableLayoutV4(page, parsedApp) : []
        );
    }
    return app.pages.flatMap((page) =>
        page.type === 'list-report-page' ? checkCondensedTableLayoutV2(page, parsedApp) : []
    );
}

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
        if (!tableType || !COMPACT_TABLE_TYPES.has(tableType)) {
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
        COMPACT_TABLE_TYPES.has(table.configuration.tableType.valueInFile ?? '')
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
