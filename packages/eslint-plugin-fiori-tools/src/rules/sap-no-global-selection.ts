/**
 * @file Detect some warning for usages of (window.)document APIs
 * @ESLint          Version 0.14.0 / February 2015
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
            globalSelection: 'Global selection modification, only modify local selections'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';
        const WINDOW_OBJECTS: any[] = [];
        const FORBIDDEN_METHODS = ['getSelection'];

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
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }

        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            for (let i = 0; i < a.length; i++) {
                if (obj === a[i]) {
                    return true;
                }
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isWindow(node: any) {
            // true if node is the global variable 'window'
            return node && isIdentifier(node) && node.name === 'window';
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
                return rememberWindow(node.left, node.right);
            },
            'MemberExpression': function (node) {
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
