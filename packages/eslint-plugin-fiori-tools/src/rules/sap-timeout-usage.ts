/**
 * @file Detect some warning for usages of (window.)document APIs
 * @ESLint          Version 0.14.0 / February 2015
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

/*eslint-disable strict*/
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
            timeoutUsage: 'Timeout with value > 0'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: any[] = [];
        // --------------------------------------------------------------------------
        // Helpers
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
            return isIdentifier(node) && node.name === 'window';
        }

        /**
         *
         * @param node
         */
        function isTimeout(node: any) {
            return isIdentifier(node) && node.name === 'setTimeout';
        }

        /**
         *
         * @param node
         */
        function isInteresting(node: any) {
            let obj = node.callee;
            if (isMember(obj)) {
                if (isWindow(obj.object) || (isIdentifier(obj.object) && contains(WINDOW_OBJECTS, obj.object.name))) {
                    // is member expression on window, check property
                    obj = obj.property;
                } else {
                    // no call on window
                    return false;
                }
            }
            // here obj may not be node.callee any more but node.callee.property
            return isTimeout(obj);
        }

        /**
         *
         * @param node
         */
        function isValid(node: any) {
            const args = node.arguments;
            return args && (args.length === 1 || (args.length > 1 && (args[1].value === 0 || args[1].value === '0')));
        }

        /**
         *
         * @param left
         * @param right
         */
        function rememberWindow(left, right) {
            if (right && isWindow(right) && left && isIdentifier(left)) {
                WINDOW_OBJECTS.push(left.name);
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node) {
                rememberWindow(node.id, node.init);
            },
            'AssignmentExpression': function (node) {
                rememberWindow(node.left, node.right);
            },
            'CallExpression': function (node) {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'timeoutUsage' });
                }
            }
        };
    }
};

export default rule;
