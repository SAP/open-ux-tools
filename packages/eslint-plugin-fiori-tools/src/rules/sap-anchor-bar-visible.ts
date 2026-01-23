import type { FioriRuleDefinition } from '../types';
import { ANCHOR_BAR_VISIBLE, type AnchorBarVisible } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: ANCHOR_BAR_VISIBLE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Anchor Bar Visible should not be configured in manifest settings for Object Page headers',
            url: 'https://ui5.sap.com/#/topic/d2ef0099542d44dc868719d908e576d0'
        },
        messages: {
            [ANCHOR_BAR_VISIBLE]:
                'The "anchorBarVisible" property should not be configured in manifest settings. Remove this property from the Object Page header configuration.'
        }
    },

    check(context) {
        const problems: AnchorBarVisible[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v4') {
                continue;
            }
            for (const page of app.pages) {
                if (page.type !== 'object-page') {
                    continue;
                }
                const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
                const manifest = parsedApp.manifestObject;

                // Navigate to the target in the manifest
                const sapUi5 = manifest['sap.ui5'] as any;
                const target = sapUi5?.routing?.targets?.[page.targetName];
                const anchorBarVisible = target?.options?.settings?.content?.header?.anchorBarVisible;

                // Check if anchorBarVisible is configured (regardless of value)
                if (anchorBarVisible !== undefined) {
                    problems.push({
                        type: ANCHOR_BAR_VISIBLE,
                        pageName: page.targetName,
                        manifest: {
                            uri: parsedApp.manifest.manifestUri,
                            object: parsedApp.manifestObject,
                            propertyPath: [
                                'sap.ui5',
                                'routing',
                                'targets',
                                page.targetName,
                                'options',
                                'settings',
                                'content',
                                'header',
                                'anchorBarVisible'
                            ]
                        }
                    });
                }
            }
        }

        return problems;
    },
    createJsonVisitorHandler: (context) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: ANCHOR_BAR_VISIBLE
            });
        }
});

export default rule;
