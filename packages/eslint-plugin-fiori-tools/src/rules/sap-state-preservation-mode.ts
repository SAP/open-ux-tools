import type { FioriRuleDefinition } from '../types';
import { createFioriRule } from '../language/rule-factory';
import { STATE_PRESERVATION_MODE, type StatePreservationMode } from '../language/diagnostics';
import type { MemberNode } from '@humanwhocodes/momoa';
import { createJsonFixer } from '../language/rule-fixer';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: STATE_PRESERVATION_MODE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'Enforce valid statePreservationMode configuration in Fiori elements manifest. Discovery mode is not supported in OData V4 applications. For OData V2 apps with Flexible Column Layout (FCL), persistence mode is recommended.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-state-preservation-mode.md'
        },
        messages: {
            invalidMode: 'Invalid value "{{value}}" for statePreservationMode. "{{recommended}}" is recommended.',
            recommendPersistenceForFCL:
                'Consider using "persistence". For applications using Flexible Column Layout (FCL), "persistence" mode is recommended.',
            recommendDiscoveryForNonFCL:
                'Consider using "discovery". For applications not using Flexible Column Layout, "discovery" mode is recommended.'
        },
        fixable: 'code'
    },
    check(context) {
        const problems: StatePreservationMode[] = [];

        // Process V2 apps
        for (const [appKey, linkedApp] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (linkedApp.type !== 'fe-v2') {
                continue;
            }

            const app = context.sourceCode.projectContext.index.apps[appKey];
            const statePreservationMode = linkedApp.configuration.statePreservationMode.valueInFile;
            const hasFCL = !!linkedApp.configuration.flexibleColumnLayout.defaultTwoColumnLayoutType.valueInFile;
            const validValues = linkedApp.configuration.statePreservationMode.values;

            if (!statePreservationMode || typeof statePreservationMode !== 'string') {
                continue;
            }

            // Check if the value is valid for V2
            if (!validValues.includes(statePreservationMode)) {
                problems.push({
                    type: STATE_PRESERVATION_MODE,
                    messageId: 'invalidMode',
                    manifest: {
                        uri: app.manifest.manifestUri,
                        object: app.manifestObject,
                        propertyPath: linkedApp.configuration.statePreservationMode.configurationPath
                    },
                    value: statePreservationMode,
                    recommendedValue: hasFCL ? 'persistence' : 'discovery'
                });
                continue;
            }

            // Provide recommendations based on FCL configuration
            // FCL apps should use persistence mode (default)
            if (hasFCL && statePreservationMode === 'discovery') {
                problems.push({
                    type: STATE_PRESERVATION_MODE,
                    messageId: 'recommendPersistenceForFCL',
                    manifest: {
                        uri: app.manifest.manifestUri,
                        object: app.manifestObject,
                        propertyPath: linkedApp.configuration.statePreservationMode.configurationPath
                    },
                    recommendedValue: 'persistence'
                });
                continue;
            }
            // Non-FCL apps should use discovery mode (default)
            if (!hasFCL && statePreservationMode === 'persistence') {
                problems.push({
                    type: STATE_PRESERVATION_MODE,
                    messageId: 'recommendDiscoveryForNonFCL',
                    manifest: {
                        uri: app.manifest.manifestUri,
                        object: app.manifestObject,
                        propertyPath: linkedApp.configuration.statePreservationMode.configurationPath
                    },
                    recommendedValue: 'discovery'
                });
            }
        }

        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, paths) =>
        function report(node: MemberNode): void {
            const messageId = diagnostic.messageId;
            context.report({
                node,
                messageId,
                data: {
                    value: diagnostic.value,
                    recommended: diagnostic.recommendedValue
                },
                fix: createJsonFixer({ context, node, deepestPathResult: paths, value: diagnostic.recommendedValue })
            });
        }
});

export default rule;
