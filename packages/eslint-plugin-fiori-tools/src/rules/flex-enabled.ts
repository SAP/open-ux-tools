import utils from '../rule-utils';
import { type FioriPropertyDefinition, PROPERTY_DEFINITIONS } from '../property-definitions';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { ManifestRuleDefinition } from '../types';

const flexEnabledDefinition: FioriPropertyDefinition = PROPERTY_DEFINITIONS.flexEnabled;

const rule: ManifestRuleDefinition = {
    meta: {
        type: flexEnabledDefinition.type,
        docs: {
            recommended: true,
            description: flexEnabledDefinition.description,
            url: flexEnabledDefinition.documentationUrl
        },
        messages: {
            flexEnabled: flexEnabledDefinition.message
        },
        fixable: flexEnabledDefinition.fixable
    },

    create(context) {
        if (!utils.checkRuleApplicable(flexEnabledDefinition, context.sourceCode.ast.body, context.filename)) {
            return {};
        }
        return {
            Member(node: MemberNode): void {
                if (node.name.type !== 'String' || node.name.value !== 'sap.ui5') {
                    return;
                }
                const expectedValue = flexEnabledDefinition.expectedValue ?? true;
                const flexEnabledNode = utils.getManifestProperty(node, 'flexEnabled');
                if (!flexEnabledNode || !utils.isMemberNode(flexEnabledNode)) {
                    // add "flexEnabled" node
                    context.report({
                        node: node,
                        messageId: 'flexEnabled',
                        fix(fixer) {
                            const valueOffset = node.value.loc.start.offset + 1;
                            return fixer.insertTextBeforeRange(
                                [valueOffset, valueOffset],
                                `\n${new Array(node.value.loc.end.column + 1).join(
                                    ' '
                                )}"flexEnabled": ${expectedValue},`
                            );
                        }
                    });
                    return;
                }
                const value = flexEnabledNode.value.type === 'Boolean' ? flexEnabledNode.value.value : undefined;
                if (value === expectedValue) {
                    return;
                }
                // change "flexEnabled" value to true
                context.report({
                    node: flexEnabledNode,
                    messageId: 'flexEnabled',
                    fix(fixer) {
                        return fixer.replaceTextRange(flexEnabledNode.value.range!, expectedValue.toString());
                    }
                });
                return;
            }
        };
    }
};

export default rule;
