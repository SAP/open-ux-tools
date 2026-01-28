// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

import type { Rule } from 'eslint';
import { contains, isIdentifier, isMember } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            legacyJquerysapUsage: 'Legacy jQuery.sap usage is not allowed due to strict Content Security Policy.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const INTERESTING_METHODS_JQUERY = ['require', 'declare'];

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a call expression represents an interesting jQuery.sap usage.
         *
         * @param node The call expression node to check
         * @returns True if the call expression represents an interesting jQuery.sap usage
         */
        function isInteresting(node: any): boolean {
            const callee = node.callee;
            if (isMember(callee)) {
                if (isIdentifier(callee.property) && contains(INTERESTING_METHODS_JQUERY, callee.property.name)) {
                    if (isMember(callee.object) && callee.object.property.name == 'sap') {
                        if (
                            isIdentifier(callee.object.object) &&
                            (callee.object.object.name == 'jQuery' || callee.object.object.name == '$')
                        ) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        return {
            'CallExpression': function (node): void {
                if (isInteresting(node)) {
                    context.report({ node: node, messageId: 'legacyJquerysapUsage' });
                }
            }
        };
    }
};

export default rule;
