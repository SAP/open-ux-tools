/**
 * @file Check that a @ControllerHook JSDoc block contains a @callback signature.
 */

import type { Rule } from 'eslint';
import { ControllerHook } from './utils/controller-hook.js';

const rule: Rule.RuleModule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Require @callback signature in @ControllerHook JSDoc blocks.',
            recommended: true
        },
        messages: {
            missingCallbackSignature: 'Controller hook documentation does not contain callback signature'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            Program() {
                const comments = context.sourceCode.getAllComments().filter((c) => c.type === 'Block');
                for (const comment of comments) {
                    const controllerHook = new ControllerHook(comment);
                    if (controllerHook.isControllerHook() && !controllerHook.getCallback()) {
                        context.report({
                            node: comment as unknown as Rule.Node,
                            messageId: 'missingCallbackSignature'
                        });
                    }
                }
            }
        };
    }
};

export default rule;
