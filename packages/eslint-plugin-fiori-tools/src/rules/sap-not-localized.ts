/**
 * @file Ensure strings passed to localization setter methods are not hardcoded.
 */

import type { Rule } from 'eslint';
import { LOCALIZATION_SETTER_METHODS } from './utils/localization-helpers.js';

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Ensure strings passed to localization setter methods are not hardcoded.',
            recommended: true
        },
        messages: {
            hardcodedString: 'All strings should be localized and defined in an external file for translation'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            CallExpression(node) {
                const callNode = node as unknown as {
                    callee: { type: string; property?: { name: string } };
                    arguments: { type: string; value: unknown }[];
                };
                if (callNode.callee.type !== 'MemberExpression') {
                    return;
                }
                const methodName = callNode.callee.property?.name ?? '';
                if (!(LOCALIZATION_SETTER_METHODS as readonly string[]).includes(methodName)) {
                    return;
                }
                const firstArg = callNode.arguments[0];
                if (firstArg?.type === 'Literal' && typeof firstArg.value === 'string' && firstArg.value.length > 0) {
                    context.report({ node, messageId: 'hardcodedString' });
                }
            }
        };
    }
};

export default rule;
