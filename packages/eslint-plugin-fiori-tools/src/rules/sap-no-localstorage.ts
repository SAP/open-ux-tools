/**
 * @file detects usage of localstaorage
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
            localStorageUsage: 'Local storage must not be used in a Fiori application'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_STORAGE_OBJECT: any[] = [];

        const MEMBER = 'MemberExpression',
            IDENTIFIER = 'Identifier';

        // --------------------------------------------------------------------------
        // Helpers
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
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: any) {
            return isType(node, IDENTIFIER);
        }
        /**
         * Check if a node is a MemberExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a MemberExpression
         */
        function isMember(node: any) {
            return isType(node, MEMBER);
        }

        /**
         * Build the callee path from a member expression node.
         *
         * @param node The member expression node to process
         * @returns String representation of the callee path
         */
        function buildCalleePath(node: any) {
            if (isMember(node.object)) {
                return buildCalleePath(node.object) + '.' + node.object.property.name;
            } else if (isIdentifier(node.object)) {
                return node.object.name;
            }
            return '';
        }

        /**
         * Check if an array contains a specific object.
         *
         * @param a The array to search in
         * @param obj The object to search for
         * @returns True if the array contains the object
         */
        function contains(a, obj) {
            return a.includes(obj);
        }

        /**
         * Check if the callee path represents a forbidden API.
         *
         * @param calleePath The path string to analyze
         * @returns The last element of the path
         */
        function isForbiddenObviousApi(calleePath) {
            const elementArray = calleePath.split('.');
            const lastElement = elementArray[elementArray.length - 1];

            return lastElement;
        }

        /**
         * Process variable declarator nodes for localStorage references.
         *
         * @param node The variable declarator node to process
         */
        function processVariableDeclarator(node: any) {
            if (node.init) {
                if (node.init.type === 'MemberExpression') {
                    const firstElement = node.init.object.name,
                        secondElement = node.init.property.name;
                    if (firstElement + '.' + secondElement === 'window.localStorage') {
                        FORBIDDEN_STORAGE_OBJECT.push(node.id.name);
                    }
                } else if (node.init.type === 'Identifier' && node.init.name === 'localStorage') {
                    FORBIDDEN_STORAGE_OBJECT.push(node.id.name);
                }
            }
        }

        return {
            'VariableDeclarator': function (node) {
                processVariableDeclarator(node);
            },
            'MemberExpression': function (node) {
                const memberExpressionNode = node;
                const calleePath = buildCalleePath(memberExpressionNode);
                const speciousObject = isForbiddenObviousApi(calleePath);

                if (
                    (calleePath === 'localStorage' || calleePath === 'window.localStorage') &&
                    speciousObject === 'localStorage'
                ) {
                    context.report({ node: node, messageId: 'localStorageUsage' });
                } else if (contains(FORBIDDEN_STORAGE_OBJECT, speciousObject)) {
                    context.report({ node: node, messageId: 'localStorageUsage' });
                }
            }
        };
    }
};

export default rule;
