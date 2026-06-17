import type { FioriRuleDefinition } from '../types.js';
import { NO_LIVE_MODE, type NoLiveMode } from '../language/diagnostics.js';
import { createFioriRule } from '../language/rule-factory.js';
import type { MemberNode } from '@humanwhocodes/momoa';
import { createJsonFixer } from '../language/rule-fixer.js';
import { FioriJSONSourceCode } from '../language/json/source-code.js';
import { FioriChangeSourceCode } from '../language/change/source-code.js';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: NO_LIVE_MODE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: '',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-live-mode.md'
        },
        messages: {
            [NO_LIVE_MODE]: 'no live mode'
        },
        fixable: 'code'
    },

    check(context) {
        if (
            !(context.sourceCode instanceof FioriJSONSourceCode || context.sourceCode instanceof FioriChangeSourceCode)
        ) {
            return [];
        }
        const problems: NoLiveMode[] = [];
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            if (app.type === 'fe-v4') {
                // manifest property
                for (const page of app.pages) {
                    if (page.type === 'list-report-page') {
                        if (page.liveMode) {
                            problems.push({
                                type: NO_LIVE_MODE,
                                pageName: page.targetName,
                                manifest: {
                                    uri: parsedApp.manifest.manifestUri,
                                    object: parsedApp.manifestObject,
                                    propertyPath: page.liveMode.configurationPath
                                }
                            });
                        }
                    }
                }
            } else if (app.type === 'fe-v2') {
                // flex change property
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
