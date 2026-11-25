/**
 * @file Detect string concatenation in localization setter methods.
 */

import type { Rule } from 'eslint';
import { LOCALIZATION_SETTER_METHODS } from './utils/localization-helpers.js';

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Detect string concatenation in localization setter methods.',
            recommended: true
        },
        messages: {
            concatenatedString:
                'Strings should not be concatenated, all concatenations must be done as a specific parameterized resource'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            CallExpression(node) {
                const callNode = node as unknown as {
                    callee: { type: string; property?: { name: string } };
                    arguments: { type: string; operator?: string }[];
                };
                if (callNode.callee.type !== 'MemberExpression') {
                    return;
                }
                const methodName = callNode.callee.property?.name ?? '';
                if (!(LOCALIZATION_SETTER_METHODS as readonly string[]).includes(methodName)) {
                    return;
                }
                const firstArg = callNode.arguments[0];
                if (firstArg?.type === 'BinaryExpression' && firstArg.operator === '+') {
                    context.report({ node, messageId: 'concatenatedString' });
                }
            }
        };
    }
};

export default rule;
