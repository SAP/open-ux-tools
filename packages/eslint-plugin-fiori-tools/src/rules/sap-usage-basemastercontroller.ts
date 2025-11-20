/**
 * @file     Check "sap-usage-basemastercontroller" should detect the usage of "sap.ca.scfld.md.controller.BaseMasterController" & "sap/ca/scfld/md/controller/BaseMasterController"..
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
            basemastercontroller:
                "Usage of deprecated 'BaseMasterController' detected. Please use 'ScfldMasterController' instead."
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();

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
         * Check if a string contains a substring.
         *
         * @param string The string to search in
         * @param substring The substring to search for
         * @returns True if the string contains the substring
         */
        function contains(string, substring): boolean {
            return string.indexOf(substring) !== -1;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'MemberExpression': function (node): void {
                const property = node.property;

                if (property.type === 'Identifier' && property.name === 'BaseMasterController') {
                    const value = sourceCode.getText(node);
                    if (isString(value) && contains(value, 'sap.ca.scfld.md.controller.BaseMasterController')) {
                        context.report({ node: node, messageId: 'basemastercontroller' });
                    }
                }
            },
            'Literal': function (node): void {
                // const val = node.value, result;
                if (isString(node.value) && contains(node.value, 'sap/ca/scfld/md/controller/BaseMasterController')) {
                    context.report({ node: node, messageId: 'basemastercontroller' });
                }
            }
        };
    }
};

export default rule;
