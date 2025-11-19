/**
 * @file Rule to flag use of a hardcoded color
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Fiori custom ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            hardcodedColor: 'Hardcoded colors are not allowed as they will break theming effort.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // variables should be defined here

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /*
         * What we will be looking for:
         *      color: #FFF,
         *      color: #ABABAB
         */
        /**
         * Check if a name matches prohibited hardcoded color patterns.
         *
         * @param name The name string to check for color patterns
         * @returns RegExp match array if color patterns found, null otherwise
         */
        function matchProhibited(name) {
            return name.match('#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})[^\\w]');
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'Literal': function (node) {
                const val = node.value;
                let result;

                if (typeof val === 'string') {
                    result = matchProhibited(node.value);

                    if (result) {
                        context.report({
                            node: node,
                            messageId: 'hardcodedColor'
                        });
                    }
                }
            }
        };
    }
};

export default rule;
