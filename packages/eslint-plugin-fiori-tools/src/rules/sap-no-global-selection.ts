/**
 * @file Detect some warning for usages of (window.)document APIs
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
            globalSelection: 'Global selection modification, only modify local selections'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: any[] = [];
        const FORBIDDEN_METHODS = ['getSelection'];

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
        function isType(node: any, type: any): boolean {
            return node?.type === type;
        }

        /**
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: any): boolean {
            return isType(node, 'Identifier');
        }

        /**
         * Check if an array contains a specific object.
         *
         * @param a The array to search in
         * @param obj The object to search for
         * @returns True if the array contains the object
         */
        function contains(a: any[], obj: any): boolean {
            return a.includes(obj);
        }

        /**
         * Check if a node represents the global window variable.
         *
         * @param node The AST node to check
         * @returns True if the node represents the global window variable
         */
        function isWindow(node: any): boolean {
            // true if node is the global variable 'window'
            return node && isIdentifier(node) && node.name === 'window';
        }

        /**
         * Check if a node represents a window object or reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents a window object or reference to it
         */
        function isWindowObject(node: any): boolean {
            // true if node is the global variable 'window' or a reference to it
            return isWindow(node) || (node && isIdentifier(node) && contains(WINDOW_OBJECTS, node.name));
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         * Remember window object references for later analysis.
         *
         * @param left The left side of the assignment
         * @param right The right side of the assignment
         * @returns True if window object was remembered, false otherwise
         */
        function rememberWindow(left: any, right: any): boolean {
            if (isWindowObject(right) && isIdentifier(left)) {
                WINDOW_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node): boolean {
                return rememberWindow(node.id, node.init);
            },
            'AssignmentExpression': function (node): boolean {
                return rememberWindow(node.left, node.right);
            },
            'MemberExpression': function (node): void {
                if (
                    node &&
                    isWindowObject(node.object) &&
                    isIdentifier(node.property) &&
                    'name' in node.property &&
                    contains(FORBIDDEN_METHODS, node.property.name)
                ) {
                    context.report({ node: node, messageId: 'globalSelection' });
                }
            }
        };
    }
};

export default rule;
