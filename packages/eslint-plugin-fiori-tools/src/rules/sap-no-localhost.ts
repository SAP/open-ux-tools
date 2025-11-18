/**
 * @file     Check "sap-no-localhost" should detect the usage of "localhost".
 */

import type { Rule } from 'eslint';
import { isString, containsString } from '../utils/ast-helpers';

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
            localhost: "Usage of 'localhost' detected"
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
         * @param substring
         */
        function containsNot(string, substring) {
            return !containsString(string, substring);
        }
        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'Literal': function (node) {
                // const val = node.value, result;
                if (
                    isString(node.value) &&
                    containsString(node.value, 'localhost') &&
                    containsNot(node.value, '://localhost/offline/')
                ) {
                    context.report({ node: node, messageId: 'localhost' });
                }
            }
        };
    }
};

export default rule;
