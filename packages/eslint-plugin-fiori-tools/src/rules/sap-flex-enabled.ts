import { type FioriPropertyDefinition, PROPERTY_DEFINITIONS } from '../property-definitions';
import type { FioriRuleDefinition } from '../types';
import { createFioriRule } from '../language/rule-factory';
import { REQUIRE_FLEX_ENABLED, type RequireFlexEnabled } from '../language/diagnostics';
import type { RuleVisitor } from '@eslint/core';
import type { MemberNode } from '@humanwhocodes/momoa';
import { isLowerThanMinimalUi5Version } from '../utils/version';
import { findDeepestExistingPath } from '../utils/helpers';

const flexEnabledDefinition: FioriPropertyDefinition = PROPERTY_DEFINITIONS.flexEnabled;

const rule: FioriRuleDefinition = createFioriRule({
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
            if (
                !app.manifest.minUI5Version ||
                isLowerThanMinimalUi5Version(app.manifest.minUI5Version, { major: 1, minor: 56 })
            ) {
                continue;
            }
            if (!app.manifest.flexEnabled) {
                problems.push({
                    type: REQUIRE_FLEX_ENABLED,
                    manifest: {
                        uri: app.manifest.manifestUri,
                        object: app.manifestObject,
                        requiredPropertyPath: ['sap.ui5'],
                        optionalPropertyPath: ['flexEnabled']
                    }
                });
            }
        }

        return problems;
    },
    createJson(context, diagnostics) {
        const applicableDiagnostics = diagnostics.filter(
            (diagnostic) => diagnostic.manifest.uri === context.sourceCode.uri
        );
        if (applicableDiagnostics.length === 0) {
            return {};
        }
        const matchers: RuleVisitor = {};

        for (const diagnostic of applicableDiagnostics) {
            const paths = findDeepestExistingPath(
                diagnostic.manifest.object,
                diagnostic.manifest.requiredPropertyPath,
                diagnostic.manifest.optionalPropertyPath
            );
            if (paths) {
                matchers[context.sourceCode.createMatcherString(paths.validatedPath)] = function report(
                    node: MemberNode
                ): void {
                    context.report({
                        node,
                        messageId: REQUIRE_FLEX_ENABLED,
                        fix(fixer) {
                            if (paths.missingSegments.length === 0) {
                                const expectedValue = flexEnabledDefinition.expectedValue ?? true;
                                if (node.value.type === 'Boolean') {
                                    return fixer.replaceTextRange(
                                        node.value.range ?? [node.value.loc.start.offset, node.value.loc.end.offset],
                                        expectedValue.toString()
                                    );
                                }
                                return null;
                            } else {
                                const valueOffset = node.value.loc.start.offset + 1;
                                return fixer.insertTextBeforeRange(
                                    [valueOffset, valueOffset],
                                    `\n${new Array(node.value.loc.end.column + 1).join(' ')}"flexEnabled": true,`
                                );
                            }
                        }
                    });
                };
            }
        }
        return matchers;
    }
});

export default rule;
