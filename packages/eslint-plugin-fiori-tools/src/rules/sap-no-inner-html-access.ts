/**
 * @file Detect the access of the innerHTML property.
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
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
            innerHtmlAccess: 'Accessing the inner html is not recommended.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a node is of a specific type.
         *
         * @param node The AST node to check
         * @param type The type to check for
         * @returns True if the node is of the specified type
         */
        function isType(node: any, type: any) {
            return node?.type === type;
        }

        /**
         * Check if a node is a Literal.
         *
         * @param node The AST node to check
         * @returns True if the node is a Literal
         */
        function isLiteral(node: any) {
            return isType(node, 'Literal');
        }

        /**
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a property access is valid (not innerHTML).
         *
         * @param property The property node to validate
         * @returns True if the property access is valid
         */
        function isValid(property) {
            // anything is valid, except 'innerHTML'
            if (isIdentifier(property)) {
                return property.name !== 'innerHTML';
            } else if (isLiteral(property)) {
                return property.value !== 'innerHTML';
            }
            return true;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'MemberExpression': function (node): void {
                if (!isValid(node.property)) {
                    context.report({ node: node, messageId: 'innerHtmlAccess' });
                }
            }
        };
    }
};

export default rule;
