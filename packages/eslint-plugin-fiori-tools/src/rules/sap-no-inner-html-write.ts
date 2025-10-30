/**
 * @file Detect the overriding of the innerHTML.
 * @ESLint Version 0.8.0 / March 2016
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------
/*eslint-disable strict*/
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
        'use strict';
        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param node
         * @param type
         */
        function isType(node: any, type: any) {
            return node && node.type === type;
        }

        /**
         *
         * @param node
         */
        function isLiteral(node: any) {
            return isType(node, 'Literal');
        }

        /**
         *
         * @param node
         */
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }

        /**
         *
         * @param node
         */
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         *
         * @param left
         */
        function isInteresting(left) {
            return isMember(left);
        }

        /**
         *
         * @param property
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
