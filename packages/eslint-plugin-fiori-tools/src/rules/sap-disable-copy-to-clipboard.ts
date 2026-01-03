import type { FioriRuleDefinition } from '../types';
import { DISABLE_COPY_TO_CLIPBOARD, type DisableCopyToClipboard } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: DISABLE_COPY_TO_CLIPBOARD,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Sets whether to disable the copy to clipboard button in tables',
            url: 'https://ui5.sap.com/#/topic/c0f6592a592e47f9bb6d09900de47412'
        },
        messages: {
            [DISABLE_COPY_TO_CLIPBOARD]:
                'Disable Copy To Clipboard must be correctly configured. If not set, copy button is displayed'
        },
        fixable: 'code'
    },

    check(context) {
        const problems: DisableCopyToClipboard[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v4') {
                continue;
            }
            for (const page of app.pages) {
                const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
                const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
                if (!parsedService) {
                    continue;
                }
                for (const table of page.lookup['table'] ?? []) {
                    if (table.configuration.disableCopyToClipboard.valueInFile === true) {
                        problems.push({
                            type: DISABLE_COPY_TO_CLIPBOARD,
                            manifest: {
                                uri: parsedApp.manifest.manifestUri,
                                object: parsedApp.manifestObject,
                                propertyPath: table.configuration.disableCopyToClipboard.configurationPath
                            }
                        });
                    }
                }
            }
        }

        return problems;
    },
    createJsonVisitorHandler: (context) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: DISABLE_COPY_TO_CLIPBOARD
                // fix
            });
        }
});

export default rule;
