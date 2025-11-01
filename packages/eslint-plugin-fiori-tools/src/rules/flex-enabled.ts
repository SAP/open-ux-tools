import utils from '../rule-utils';
import { type FioriPropertyDefinition, PROPERTY_DEFINITIONS } from '../property-definitions';
import type { DocumentNode } from '@humanwhocodes/momoa';

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
        return {
            Document(node: DocumentNode): void {
                if (!utils.checkRuleApplicable(flexEnabledDefinition, node.body as any, context.filename)) {
                    return;
                }
                const sapUI5Node = utils.getManifestProperty(node.body, 'sap.ui5');
                if (!sapUI5Node || !utils.isMemberNode(sapUI5Node)) {
                    // no "sap.ui5" node found
                    return;
                }
                const flexEnabledNode = utils.getManifestProperty(sapUI5Node, 'flexEnabled');
                const expectedValue = flexEnabledDefinition.expectedValue ?? true;
                if (!flexEnabledNode || !utils.isMemberNode(flexEnabledNode)) {
                    // no "flexEnabled" node found
                    context.report({
                        loc: sapUI5Node.loc,
                        node: sapUI5Node,
                        messageId: 'flexEnabled',
                        fix(fixer) {
                            const valueOffset = sapUI5Node.value.loc.start.offset + 1;
                            return fixer.insertTextBeforeRange(
                                [valueOffset, valueOffset],
                                `\n${new Array(sapUI5Node.value.loc.end.column + 1).join(
                                    ' '
                                )}"flexEnabled": ${expectedValue},`
                            );
                        }
                    });
                    return;
                }
                // "flexEnabled" node found, check its value
                const value = flexEnabledNode.value.type === 'Boolean' ? flexEnabledNode.value.value : undefined;
                if (value === expectedValue) {
                    return;
                }
                context.report({
                    loc: flexEnabledNode.loc,
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
