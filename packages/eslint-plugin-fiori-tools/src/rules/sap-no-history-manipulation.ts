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
            historyManipulation:
                'Direct history manipulation, does not work with deep links, use router and navigation events instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';
        const WINDOW_OBJECTS: any[] = [];
        const HISTORY_OBJECTS: any[] = [];
        //    const INTERESTING_HISTORY_METHODS = [
        //            "forward", "back", "go"
        //    ];

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
         * @param node
         */
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }
        /**
         *
         * @param node
         */
        function isCondition(node: any) {
            return isType(node, 'IfStatement') || isType(node, 'ConditionalExpression');
        }
        /**
         *
         * @param node
         */
        function isUnary(node: any) {
            return isType(node, 'UnaryExpression');
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

        /**
         *
         * @param node
         */
        function isHistory(node: any) {
            if (node) {
                if (isIdentifier(node)) {
                    // true if node id the global variable 'history'
                    return node.name === 'history';
                } else if (isMember(node)) {
                    // true if node id the global variable 'window.history' or '<windowReference>.history'
                    return isWindowObject(node.object) && isHistory(node.property);
                }
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isHistoryObject(node: any) {
            // true if node is the global variable 'document'/'window.history' or a reference to it
            return isHistory(node) || (node && isIdentifier(node) && contains(HISTORY_OBJECTS, node.name));
        }

        /**
         *
         * @param node
         * @param maxDepth
         */
        function isInCondition(node: any, maxDepth: any) {
            // we check the depth here because the call might be nested in a block statement and in an expression statement (http://jointjs.com/demos/javascript-ast)
            // (true?history.back():''); || if(true) history.back(); || if(true){history.back();} || if(true){}else{history.back();}
            if (maxDepth > 0) {
                const parent = node.parent;
                return isCondition(parent) || isInCondition(parent, maxDepth - 1);
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isMinusOne(node: any) {
            return isUnary(node) && node.operator === '-' && isLiteral(node.argument) && node.argument.value === 1;
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

        /**
         *
         * @param left
         * @param right
         */
        function rememberHistory(left, right) {
            if (isHistoryObject(right) && isIdentifier(left)) {
                HISTORY_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isInteresting(node: any) {
            // check if callee is ref to history.back / .go / .forward
            if (
                node &&
                isMember(node.callee) &&
                isHistoryObject(node.callee.object) &&
                isIdentifier(node.callee.property)
            ) {
                return true;
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isValid(node: any) {
            switch (node.callee.property.name) {
                case 'forward':
                    return false;
                case 'back':
                    return isInCondition(node, 3);
                case 'go':
                    const args = node.arguments;
                    return args.length === 1 && isMinusOne(args[0]) && isInCondition(node, 3);
                default:
            }
            return true;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'CallExpression': function (node) {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'historyManipulation' });
                }
            },
            'VariableDeclarator': function (node) {
                return rememberWindow(node.id, node.init) || rememberHistory(node.id, node.init);
            },
            'AssignmentExpression': function (node) {
                return rememberWindow(node.left, node.right) || rememberHistory(node.left, node.right);
            }
        };
    }
};

export default rule;
