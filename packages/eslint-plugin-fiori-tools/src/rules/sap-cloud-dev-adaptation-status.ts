import type { FioriRuleDefinition } from '../types.js';
import { createFioriRule } from '../language/rule-factory.js';
import { CLOUD_DEV_ADAPTATION_STATUS, type CloudDevAdaptationStatus } from '../language/diagnostics.js';
import type { MemberNode } from '@humanwhocodes/momoa';
import { FioriJSONSourceCode } from '../language/json/source-code.js';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: CLOUD_DEV_ADAPTATION_STATUS,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'Ensures that "cloudDevAdaptationStatus" is defined in the "sap.fiori" section of the manifest.json file.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-cloud-dev-adaptation-status.md'
        },
        messages: {
            [CLOUD_DEV_ADAPTATION_STATUS]:
                "The application hasn't set a release status for the developer adaptation in the cloud."
        }
    },
    check(context) {
        if (!(context.sourceCode instanceof FioriJSONSourceCode)) {
            return [];
        }
        const problems: CloudDevAdaptationStatus[] = [];
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.configuration.cloudDevAdaptationStatus.valueInFile !== undefined) {
                continue;
            }
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const configPath = app.configuration.cloudDevAdaptationStatus.configurationPath;
            const node = context.sourceCode.getNode(context.sourceCode.ast.body, ['sap.fiori']);
            problems.push({
                type: CLOUD_DEV_ADAPTATION_STATUS,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: configPath,
                    loc: node.loc
                }
            });
        }
        return problems;
    },
    createJsonVisitorHandler: (context, _diagnostic, _deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: CLOUD_DEV_ADAPTATION_STATUS
            });
        }
});

export default rule;
