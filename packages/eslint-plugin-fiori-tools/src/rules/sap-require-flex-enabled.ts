import { type FioriPropertyDefinition, PROPERTY_DEFINITIONS } from '../property-definitions';
import type { FioriRuleDefinition } from '../types';
import { createMixedRule } from '../language/rule-factory';
import { REQUIRE_FLEX_ENABLED, type RequireFlexEnabled } from '../language/diagnostics';
import { RuleVisitor } from '@eslint/core';
import { MemberNode } from '@humanwhocodes/momoa';

const flexEnabledDefinition: FioriPropertyDefinition = PROPERTY_DEFINITIONS.flexEnabled;

const rule: FioriRuleDefinition = createMixedRule({
    ruleId: REQUIRE_FLEX_ENABLED,
    meta: {
        type: flexEnabledDefinition.type,
        docs: {
            recommended: true,
            description: flexEnabledDefinition.description,
            url: flexEnabledDefinition.documentationUrl
        },
        messages: {
            [REQUIRE_FLEX_ENABLED]: flexEnabledDefinition.message
        },
        fixable: flexEnabledDefinition.fixable
    },
    check(context) {
        const problems: RequireFlexEnabled[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.index.apps)) {
            const manifest = app.manifestObject;
            
            // Check the actual current manifest state to prevent circular fixes
            // The app.manifest object is from the index which doesn't update between fix passes
            const currentFlexEnabled = manifest?.['sap.ui5']?.flexEnabled;
            
            if (!app.manifest.flexEnabled && currentFlexEnabled !== true) {
                problems.push({
                    type: REQUIRE_FLEX_ENABLED,
                    manifestPropertyPath: ['sap.ui5', 'flexEnabled'],
                    propertyName: 'flexEnabled'
                });
            }
            //  else if (flexEnabled === false) {
            // } else {
            //     problems.push({
            //         type: REQUIRE_FLEX_ENABLED,
            //         manifestPropertyPath: ['sap.ui5'],
            //         propertyName: 'flexEnabled'
            //     });
            // }
        }

        return problems;
    },
    createJson(context, diagnostics) {
        if (diagnostics.length === 0) {
            return {};
        }
        const matchers: RuleVisitor = {};
        function report(node: MemberNode) {
            // Double-check that the fix hasn't already been applied
            // This prevents circular fixes when the index doesn't update between passes
            if (node.value.type === 'Boolean') {
                // If node is already a Boolean with value true, skip
                if ((node.value as any).value === true) {
                    return;
                }
            } else if (node.value.type === 'Object') {
                const flexProp = node.value.members.find(
                    (m: any) => m.name.type === 'String' && m.name.value === 'flexEnabled'
                );
                if (flexProp?.value?.type === 'Boolean' && (flexProp.value as any).value === true) {
                    return;
                }
            }
            context.report({
                node,
                messageId: REQUIRE_FLEX_ENABLED,
                fix(fixer) {
                    const expectedValue = flexEnabledDefinition.expectedValue ?? true;
                    if (node.value.type === 'Boolean') {
                        return fixer.replaceTextRange(
                            node.value.range ?? [node.value.loc.start.offset, node.value.loc.end.offset],
                            expectedValue.toString()
                        );
                    }
                    const valueOffset = node.value.loc.start.offset + 1;
                    return fixer.insertTextBeforeRange(
                        [valueOffset, valueOffset],
                        `\n${new Array(node.value.loc.end.column + 1).join(' ')}"flexEnabled": ${expectedValue},`
                    );
                }
            });
        }
        for (const diagnostic of diagnostics) {
            matchers[context.sourceCode.createMatcherString(diagnostic.manifestPropertyPath)] = report;
        }
        return matchers;
    }
});

export default rule;
