import type { FioriRuleDefinition } from '../types';
import { ANCHOR_BAR_VISIBLE, type AnchorBarVisible } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import { createJsonFixer } from '../language/rule-fixer';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: ANCHOR_BAR_VISIBLE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'Anchor Bar Visible should not be set to false in manifest settings for Object Page headers (except Form Entry Object Pages)',
            url: 'https://ui5.sap.com/#/topic/d2ef0099542d44dc868719d908e576d0'
        },
        messages: {
            [ANCHOR_BAR_VISIBLE]:
                'The "anchorBarVisible" property should not be set to false in manifest settings. Remove this property from the Object Page header configuration. Exception: Form Entry Object Pages can have both "visible" and "anchorBarVisible" set to false.'
        },
        fixable: 'code'
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
                const target = manifest['sap.ui5']?.routing?.targets?.[page.targetName];
                const header = (target as any)?.options?.settings?.content?.header;
                const anchorBarVisible: unknown = header?.anchorBarVisible;
                const headerVisible: unknown = header?.visible;

                // Check if anchorBarVisible is set to false
                // Exception: Form Entry Object Pages can have both visible: false and anchorBarVisible: false
                if (anchorBarVisible === false && headerVisible !== false) {
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
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: ANCHOR_BAR_VISIBLE,
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
