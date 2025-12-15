/**
 * @file Rule to flag use of a hardcoded color
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * RegExp pattern for hardcoded color detection.
 * Matches #RRGGBB or #RGB color patterns.
 */
const HARDCODED_COLOR_PATTERN = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})[^\w]/;

/**
 * Check if a name matches prohibited hardcoded color patterns.
 *
 * @param name The name string to check for color patterns
 * @returns RegExp exec result if color patterns found, null otherwise
 */
function matchProhibited(name: string): RegExpExecArray | null {
    return HARDCODED_COLOR_PATTERN.exec(name);
}

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
            hardcodedColor: 'Hardcoded colors are not allowed as they will break theming effort.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'Literal': function (node): void {
                const val = node.value;
                let result;

                if (typeof val === 'string') {
                    result = matchProhibited(val);

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
