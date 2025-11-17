/**
 * @file Detect the definition of global properties in the window object
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
            globalDefine: 'Definition of global variable/api in window object is not permitted.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: any[] = [];

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param node
         * @param type
         */
        function isType(node: any, type: any) {
            return node?.type === type;
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

        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            return a.includes(obj);
        }

        /**
         *
         * @param node
         */
        function isWindow(node: any) {
            // true if node is the global variable 'window'
            return isIdentifier(node) && node.name === 'window';
        }

        /**
         *
         * @param node
         */
        function isWindowObject(node: any) {
            // true if node is the global variable 'window' or a reference to it
            return isWindow(node) || (node && isIdentifier(node) && contains(WINDOW_OBJECTS, node.name));
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param left
         * @param right
         */
        function rememberWindow(left, right) {
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
            'VariableDeclarator': function (node) {
                return rememberWindow(node.id, node.init);
            },
            'AssignmentExpression': function (node) {
                // check if anything is assigned to a window property
                if (isMember(node.left) && 'object' in node.left && isWindowObject(node.left.object)) {
                    context.report({ node: node, messageId: 'globalDefine' });
                }
                return rememberWindow(node.left, node.right);
            }
        };
    }
};

export default rule;
