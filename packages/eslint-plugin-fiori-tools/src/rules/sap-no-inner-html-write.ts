/**
 * @file Detect the overriding of the innerHTML.
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
            innerHtmlWrite: 'Writing to the inner html is not allowed.'
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

        /**
         * Check if a node is a MemberExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a MemberExpression
         */
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a left-hand side expression is interesting for analysis.
         *
         * @param left The left-hand side expression to check
         * @returns True if the expression is interesting for analysis
         */
        function isInteresting(left) {
            return isMember(left);
        }

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
            'AssignmentExpression': function (node) {
                if (isInteresting(node.left) && 'property' in node.left && !isValid(node.left.property)) {
                    context.report({ node: node, messageId: 'innerHtmlWrite' });
                }
            }
        };
    }
};

export default rule;
