import type { FioriRuleDefinition } from '../types';
import { TABLE_COLUMN_VERTICAL_ALIGNMENT } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import { createJsonFixer } from '../language/rule-fixer';
import { isLowerThanMinimalUi5Version } from '../utils/version';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: TABLE_COLUMN_VERTICAL_ALIGNMENT,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Sets a vertical alignment of columns in Responsive type tables',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-table-column-vertical-alignment.md'
        },
        messages: {
            [TABLE_COLUMN_VERTICAL_ALIGNMENT]:
                '"tableColumnVerticalAlignment" for Responsive tables must be set to "Middle" - the default value'
        },
        fixable: 'code'
    },

    check(context) {
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v2') {
                continue;
            }
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            if (
                !parsedApp.manifest.minUI5Version ||
                isLowerThanMinimalUi5Version(parsedApp.manifest.minUI5Version, { major: 1, minor: 75 })
            ) {
                continue;
            }
            const columnVerticalAlignment = app.configuration.tableColumnVerticalAlignment?.valueInFile;
            if (!columnVerticalAlignment || columnVerticalAlignment === 'Middle') {
                continue;
            }
            const responsiveTable = app.pages.find((page) =>
                (page.lookup['table'] ?? []).find(
                    (table) => table.configuration.tableType.valueInFile === 'ResponsiveTable'
                )
            );
            if (!responsiveTable) {
                continue;
            }
            return [
                {
                    type: TABLE_COLUMN_VERTICAL_ALIGNMENT,
                    manifest: {
                        uri: parsedApp.manifest.manifestUri,
                        object: parsedApp.manifestObject,
                        propertyPath: app.configuration.tableColumnVerticalAlignment.configurationPath
                    }
                }
            ];
        }
        return [];
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: TABLE_COLUMN_VERTICAL_ALIGNMENT,
                fix: createJsonFixer({
                    context,
                    deepestPathResult,
                    node,
                    operation: 'delete'
                })
            });
        }
});

export default rule;
