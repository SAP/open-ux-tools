import type { FioriRuleDefinition } from '../types';
import { createFioriRule } from '../language/rule-factory';
import { STATE_PRESERVATION_MODE, type StatePreservationMode } from '../language/diagnostics';
import type { MemberNode } from '@humanwhocodes/momoa';
import { createJsonFixer } from '../language/rule-fixer';
import type { LinkedFeV2App } from '../project-context/linker/fe-v2';
import type { ParsedApp } from '../project-context/parser';

/**
 * Checks if state preservation mode value is invalid and returns problem if so.
 *
 * @param statePreservationMode - The state preservation mode value to validate
 * @param validValues - Array of valid state preservation mode values
 * @param hasFCL - Whether the app uses Flexible Column Layout
 * @param linkedApp - The linked V2 app configuration
 * @param app - The parsed app information
 * @returns A problem object if invalid, undefined otherwise
 */
function checkInvalidMode(
    statePreservationMode: string,
    validValues: string[],
    hasFCL: boolean,
    linkedApp: LinkedFeV2App,
    app: ParsedApp
): StatePreservationMode | undefined {
    if (!validValues.includes(statePreservationMode)) {
        return {
            type: STATE_PRESERVATION_MODE,
            messageId: 'invalidMode',
            manifest: {
                uri: app.manifest.manifestUri,
                object: app.manifestObject,
                propertyPath: linkedApp.configuration.statePreservationMode.configurationPath
            },
            value: statePreservationMode,
            recommendedValue: hasFCL ? 'persistence' : 'discovery'
        };
    }
    return undefined;
}

/**
 * Checks for non-recommended mode configuration and returns problem if found.
 *
 * @param statePreservationMode - The state preservation mode value to check
 * @param hasFCL - Whether the app uses Flexible Column Layout
 * @param linkedApp - The linked V2 app configuration
 * @param app - The parsed app information
 * @returns A problem object if non-recommended configuration found, undefined otherwise
 */
function checkModeRecommendation(
    statePreservationMode: string,
    hasFCL: boolean,
    linkedApp: LinkedFeV2App,
    app: ParsedApp
): StatePreservationMode | undefined {
    // FCL apps should use persistence mode
    if (hasFCL && statePreservationMode === 'discovery') {
        return {
            type: STATE_PRESERVATION_MODE,
            messageId: 'recommendPersistenceForFCL',
            manifest: {
                uri: app.manifest.manifestUri,
                object: app.manifestObject,
                propertyPath: linkedApp.configuration.statePreservationMode.configurationPath
            },
            recommendedValue: 'persistence'
        };
    }
    // Non-FCL apps should use discovery mode
    if (!hasFCL && statePreservationMode === 'persistence') {
        return {
            type: STATE_PRESERVATION_MODE,
            messageId: 'recommendDiscoveryForNonFCL',
            manifest: {
                uri: app.manifest.manifestUri,
                object: app.manifestObject,
                propertyPath: linkedApp.configuration.statePreservationMode.configurationPath
            },
            recommendedValue: 'discovery'
        };
    }
    return undefined;
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: STATE_PRESERVATION_MODE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Ensure valid statePreservationMode configuration in Fiori elements manifest',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-state-preservation-mode.md'
        },
        messages: {
            invalidMode: 'Invalid value "{{value}}" for statePreservationMode. "{{recommended}}" is recommended.',
            recommendPersistenceForFCL:
                'Consider using default. For applications using Flexible Column Layout (FCL), default is "persistence" mode.',
            recommendDiscoveryForNonFCL:
                'Consider using default. For applications not using Flexible Column Layout, default is "discovery" mode.'
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
            const invalidProblem = checkInvalidMode(statePreservationMode, validValues, hasFCL, linkedApp, app);
            if (invalidProblem) {
                problems.push(invalidProblem);
                continue;
            }

            // Provide recommendations based on FCL configuration
            const recommendationProblem = checkModeRecommendation(statePreservationMode, hasFCL, linkedApp, app);
            if (recommendationProblem) {
                problems.push(recommendationProblem);
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
                fix: createJsonFixer({
                    context,
                    node,
                    deepestPathResult: paths,
                    value: diagnostic.recommendedValue,
                    operation: 'delete'
                })
            });
        }
});

export default rule;
