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
                'Checks the liveMode property is not enabled, so the "GO" button is displayed in the application filter bar.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-live-mode.md'
        },
        messages: {
            [NO_LIVE_MODE]:
                'The Go Button must always be present in the application filter bar, so the liveMode property should not be used.'
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
                return [];
            }
            for (const page of app.pages) {
                if (page.type === 'list-report-page') {
                    if (page.liveMode.valueInFile) {
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
