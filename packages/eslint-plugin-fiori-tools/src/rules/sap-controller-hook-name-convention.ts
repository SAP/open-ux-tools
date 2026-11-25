/**
 * @file Check that a @ControllerHook callback name follows the `ext<UpperCase>` naming convention.
 */

import type { Rule } from 'eslint';
import { ControllerHook } from './utils/controller-hook.js';

const ALLOWED_PREFIX = 'ext';

/**
 * Returns true if the callback name follows the `ext<UpperCaseSuffix>` convention.
 *
 * @param name
 */
function hasValidNameConvention(name: string): boolean {
    if (!name.startsWith(ALLOWED_PREFIX)) {
        return false;
    }
    const suffix = name.slice(ALLOWED_PREFIX.length);
    if (suffix.length === 0) {
        return false;
    }
    return suffix.startsWith(suffix[0].toUpperCase());
}

const rule: Rule.RuleModule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: "Require @ControllerHook callback names to start with 'ext' followed by an uppercase letter.",
            recommended: true
        },
        messages: {
            badNameConvention: "The callback function name must start with 'ext' followed by an uppercase letter"
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            Program() {
                const comments = context.sourceCode.getAllComments().filter((c) => c.type === 'Block');
                for (const comment of comments) {
                    const controllerHook = new ControllerHook(comment);
                    if (!controllerHook.isControllerHook()) {
                        continue;
                    }
                    const name = controllerHook.getCallbackName();
                    if (!name || name.length === 0) {
                        continue;
                    }
                    if (!hasValidNameConvention(name)) {
                        context.report({
                            node: comment as unknown as Rule.Node,
                            messageId: 'badNameConvention'
                        });
                    }
                }
            }
        };
    }
};

export default rule;
