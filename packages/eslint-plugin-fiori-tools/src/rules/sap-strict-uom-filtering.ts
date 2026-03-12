import type { FioriRuleDefinition } from '../types';
import { STRICT_UOM_FILTERING, type StrictUomFiltering } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import { createJsonFixer } from '../language/rule-fixer';
import { isLowerThanMinimalUi5Version } from '../utils/version';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: STRICT_UOM_FILTERING,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'The "disableStrictUomFiltering" setting in sap.fe.app should not be set to true, as it disables strict unit-of-measure filtering.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-strict-uom-filtering.md'
        },
        messages: {
            [STRICT_UOM_FILTERING]:
                'The "disableStrictUomFiltering" property should not be set to true. Remove this property or set it to false to keep strict unit-of-measure filtering active.'
        },
        fixable: 'code'
    },

    check(context) {
        const problems: StrictUomFiltering[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v4') {
                continue;
            }
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            if (
                !parsedApp.manifest.minUI5Version ||
                isLowerThanMinimalUi5Version(parsedApp.manifest.minUI5Version, { major: 1, minor: 143 })
            ) {
                continue;
            }
            if (app.configuration.disableStrictUomFiltering.valueInFile === true) {
                problems.push({
                    type: STRICT_UOM_FILTERING,
                    manifest: {
                        uri: parsedApp.manifest.manifestUri,
                        object: parsedApp.manifestObject,
                        propertyPath: app.configuration.disableStrictUomFiltering.configurationPath
                    }
                });
            }
        }

        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: STRICT_UOM_FILTERING,
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
