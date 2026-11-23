/**
 * @file Report detected uses of `eslint-disable` comments.
 */

import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Report detected uses of `eslint-disable` comments.',
            recommended: true
        },
        messages: {
            eslintDisableDetected: 'Detected use of `eslint-disable`'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            Program() {
                const comments = context.sourceCode.getAllComments();
                for (const comment of comments) {
                    if (/^eslint-disable(?:-line|-next-line)?(?:\s|$)/u.test(comment.value.trim())) {
                        context.report({ node: comment as unknown as Rule.Node, messageId: 'eslintDisableDetected' });
                    }
                }
            }
        };
    }
};

export default rule;
