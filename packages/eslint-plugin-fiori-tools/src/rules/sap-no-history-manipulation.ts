/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
import {
    isType,
    isIdentifier,
    isMember,
    isLiteral,
    createIsWindowObject,
    createRememberWindow,
    createIsHistory,
    createIsHistoryObject,
    createRememberHistory
} from '../utils/helpers';

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
            historyManipulation:
                'Direct history manipulation, does not work with deep links, use router and navigation events instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const HISTORY_OBJECTS: string[] = [];
        //    const INTERESTING_HISTORY_METHODS = [
        //            "forward", "back", "go"
        //    ];

        // Initialize factory functions
        const isWindowObject = createIsWindowObject(WINDOW_OBJECTS);
        const rememberWindow = createRememberWindow(WINDOW_OBJECTS, isWindowObject);
        const isHistory = createIsHistory(isWindowObject);
        const isHistoryObject = createIsHistoryObject(HISTORY_OBJECTS, isHistory);
        const rememberHistory = createRememberHistory(HISTORY_OBJECTS, isHistoryObject);

        // --------------------------------------------------------------------------
        // Helper Functions
        // --------------------------------------------------------------------------
        /**
         * Check if a node represents a condition statement.
         *
         * @param node The AST node to check
         * @returns True if the node represents a condition statement
         */
        function isCondition(node: any): boolean {
            return isType(node, 'IfStatement') || isType(node, 'ConditionalExpression');
        }
        /**
         * Check if a node represents a unary expression.
         *
         * @param node The AST node to check
         * @returns True if the node represents a unary expression
         */
        function isUnary(node: any): boolean {
            return isType(node, 'UnaryExpression');
        }

        /**
         * Check if a node is within a conditional statement up to a maximum depth.
         *
         * @param node The AST node to check
         * @param maxDepth Maximum depth to search for conditions
         * @returns True if the node is within a conditional statement
         */
        function isInCondition(node: any, maxDepth: number): boolean {
            // we check the depth here because the call might be nested in a block statement and in an expression statement (http://jointjs.com/demos/javascript-ast)
            // (true?history.back():''); || if(true) history.back(); || if(true){history.back();} || if(true){}else{history.back();}
            if (maxDepth > 0) {
                const parent = node.parent;
                return isCondition(parent) || isInCondition(parent, maxDepth - 1);
            }
            return false;
        }

        /**
         * Check if a node represents the value -1.
         *
         * @param node The AST node to check
         * @returns True if the node represents the value -1
         */
        function isMinusOne(node: any): boolean {
            return isUnary(node) && node.operator === '-' && isLiteral(node.argument) && node.argument.value === 1;
        }

        /**
         * Check if a call expression is interesting for history manipulation detection.
         *
         * @param node The call expression node to check
         * @returns True if the call expression is interesting for history manipulation detection
         */
        function isInteresting(node: any): boolean {
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
         * Check if a history manipulation call is valid.
         *
         * @param node The call expression node to validate
         * @returns True if the history manipulation call is valid
         */
        function isValid(node: any): boolean {
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
            'CallExpression': function (node): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'historyManipulation' });
                }
            },
            'VariableDeclarator': function (node): boolean {
                return rememberWindow(node.id, node.init) || rememberHistory(node.id, node.init);
            },
            'AssignmentExpression': function (node): boolean {
                return rememberWindow(node.left, node.right) || rememberHistory(node.left, node.right);
            }
        };
    }
};

export default rule;
