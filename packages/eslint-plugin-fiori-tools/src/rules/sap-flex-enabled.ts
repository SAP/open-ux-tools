import type { FioriRuleDefinition } from '../types';
import { createFioriRule } from '../language/rule-factory';
import { FLEX_ENABLED, type FlexEnabled } from '../language/diagnostics';
import type { MemberNode } from '@humanwhocodes/momoa';
import { isLowerThanMinimalUi5Version } from '../utils/version';
import { createJsonFixer } from '../language/rule-fixer';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: FLEX_ENABLED,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                '"flexEnabled" flag in the manifest.json indicates that your application is enabled for UI adaptation.',
            url: 'https://ui5.sap.com/sdk/#/topic/f1430c0337534d469da3a56307ff76af'
        },
        messages: {
            [FLEX_ENABLED]: '"flexEnabled" should be set to true to enable UI adaptation features'
        },
        fixable: 'code'
    },
    check(context) {
        const problems: FlexEnabled[] = [];

        for (const [, app] of Object.entries(context.sourceCode.projectContext.index.apps)) {
            if (
                !app.manifest.minUI5Version ||
                isLowerThanMinimalUi5Version(app.manifest.minUI5Version, { major: 1, minor: 56 })
            ) {
                continue;
            }
            if (!app.manifest.flexEnabled) {
                problems.push({
                    type: FLEX_ENABLED,
                    manifest: {
                        uri: app.manifest.manifestUri,
                        object: app.manifestObject,
                        propertyPath: ['sap.ui5', 'flexEnabled']
                    }
                });
            }
        }

        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, paths) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: FLEX_ENABLED,
                fix: createJsonFixer({
                    value: true,
                    context,
                    deepestPathResult: paths,
                    node
                })
            });
        }
});

export default rule;
