import { type FioriPropertyDefinition, PROPERTY_DEFINITIONS } from '../property-definitions';
import type { FioriMixedRuleDefinition } from '../types';
import { createMixedRule } from '../language/rule-factory';
import { REQUIRE_FLEX_ENABLED, type RequireFlexEnabled } from '../language/diagnostics';
import { RuleVisitor } from '@eslint/core';
import { MemberNode } from '@humanwhocodes/momoa';

const flexEnabledDefinition: FioriPropertyDefinition = PROPERTY_DEFINITIONS.flexEnabled;

const rule: FioriMixedRuleDefinition = createMixedRule({
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

        for (const [, app] of Object.entries(context.sourceCode.projectContext.index.apps)) {
            const manifest = app.manifestObject;
            const flexEnabled = manifest?.['sap.ui5']?.flexEnabled;
            if (flexEnabled === flexEnabledDefinition.defaultValue) {
                continue;
            } else if (flexEnabled === false) {
                problems.push({
                    type: REQUIRE_FLEX_ENABLED,
                    manifestPropertyPath: ['sap.ui5', 'flexEnabled'],
                    propertyName: 'flexEnabled'
                });
            } else {
                problems.push({
                    type: REQUIRE_FLEX_ENABLED,
                    manifestPropertyPath: ['sap.ui5'],
                    propertyName: 'flexEnabled'
                });
            }
        }

        return problems;
    },
    createJson(context, diagnostics) {
        if (diagnostics.length === 0) {
            return {};
        }
        const matchers: RuleVisitor = {};
        function report(node: MemberNode) {
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
            matchers[createMatcherString(diagnostic.manifestPropertyPath)] = report;
        }
        return matchers;

        /**
         *
         * @param path
         */
        function createMatcherString(path: string[]) {
            return path.map((segment) => `Member[name.value="${segment}"]`).join(' ');
        }
    }
});

export default rule;
