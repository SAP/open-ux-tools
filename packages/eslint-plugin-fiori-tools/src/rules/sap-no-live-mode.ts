import type { FioriRuleDefinition } from '../types.js';
import { NO_LIVE_MODE, type NoLiveMode } from '../language/diagnostics.js';
import { createFioriRule } from '../language/rule-factory.js';
import type { MemberNode } from '@humanwhocodes/momoa';
import { createJsonFixer } from '../language/rule-fixer.js';
import { FioriJSONSourceCode } from '../language/json/source-code.js';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: NO_LIVE_MODE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'The rule checks that live mode is not used. When enabled, the content area loads automatically and refreshes with every filter value change.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-live-mode.md'
        },
        messages: {
            [NO_LIVE_MODE]: 'Live mode must not be used because it has a negative impact on performance.'
        },
        fixable: 'code'
    },

    check(context) {
        if (!(context.sourceCode instanceof FioriJSONSourceCode)) {
            return [];
        }
        const problems: NoLiveMode[] = [];
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            if (app.type !== 'fe-v4') {
                continue;
            }
            for (const page of app.pages) {
                if (page.type === 'list-report-page') {
                    if (page.liveMode.valueInFile) {
                        const node = context.sourceCode.getNode(
                            context.sourceCode.ast.body,
                            page.liveMode.configurationPath
                        );
                        problems.push({
                            type: NO_LIVE_MODE,
                            pageName: page.targetName,
                            manifest: {
                                uri: parsedApp.manifest.manifestUri,
                                object: parsedApp.manifestObject,
                                propertyPath: page.liveMode.configurationPath,
                                loc: node.loc
                            }
                        });
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
                messageId: NO_LIVE_MODE,
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
