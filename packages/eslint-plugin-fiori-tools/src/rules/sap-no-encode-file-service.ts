/**
 * @file        Check "sap-no-encode-file-service" should detect the usage of "/sap/bc/ui2/encode_file".
 */

import type { Rule } from 'eslint';

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
            encodeFileService: "Usage of phrase '/sap/bc/ui2/encode_file' detected"
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a value is a string.
         *
         * @param string The value to check
         * @returns True if the value is a string
         */
        function isString(string): boolean {
            return typeof string === 'string';
        }

        /**
         * Check if a string starts with a substring.
         *
         * @param base The base string to check
         * @param sub The substring to look for at the start
         * @returns True if the base string starts with the substring
         */
        function startsWith(base, sub): boolean {
            return base.indexOf(sub) === 0;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'Literal': function (node): void {
                const value = node.value;
                if (isString(value) && startsWith(value, '/sap/bc/ui2/encode_file')) {
                    context.report({ node: node, messageId: 'encodeFileService' });
                }
            }
        };
    }
};

export default rule;
