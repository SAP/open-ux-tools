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
         *
         * @param string
         */
        function isString(string) {
            return typeof string === 'string';
        }

        /**
         *
         * @param base
         * @param sub
         */
        function startsWith(base, sub) {
            return base.indexOf(sub) === 0;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'Literal': function (node) {
                const value = node.value;
                if (isString(value) && startsWith(value, '/sap/bc/ui2/encode_file')) {
                    context.report({ node: node, messageId: 'encodeFileService' });
                }
            }
        };
    }
};

export default rule;
