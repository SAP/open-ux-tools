/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    type ASTNode,
    type BaseNode,
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
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node represents a condition statement.
 *
 * @param node The AST node to check
 * @returns True if the node represents a condition statement
 */
function isCondition(node: ASTNode): boolean {
    return isType(node, 'IfStatement') || isType(node, 'ConditionalExpression');
}

/**
 * Check if a node represents a unary expression.
 *
 * @param node The AST node to check
 * @returns True if the node represents a unary expression
 */
function isUnary(node: ASTNode): boolean {
    return isType(node, 'UnaryExpression');
}

/**
 * Check if a node is within a conditional statement up to a maximum depth.
 *
 * @param node The AST node to check
 * @param maxDepth Maximum depth to search for conditions
 * @returns True if the node is within a conditional statement
 */
function isInCondition(node: BaseNode, maxDepth: number): boolean {
    // we check the depth here because the call might be nested in a block statement and in an expression statement (http://jointjs.com/demos/javascript-ast)
    // (true?history.back():''); || if(true) history.back(); || if(true){history.back();} || if(true){}else{history.back();}
    if (maxDepth > 0) {
        const parent = node.parent as BaseNode;
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
function isMinusOne(node: ASTNode): boolean {
    const unaryNode = node as BaseNode & { operator?: string; argument?: ASTNode & { value?: unknown } };
    return (
        isUnary(node) && unaryNode.operator === '-' && isLiteral(unaryNode.argument) && unaryNode.argument?.value === 1
    );
}

/**
 * Check if a history manipulation call is valid.
 *
 * @param node The call expression node to validate
 * @returns True if the history manipulation call is valid
 */
function isValid(node: BaseNode): boolean {
    const callNode = node as BaseNode & {
        callee?: BaseNode & { property?: BaseNode & { name?: string } };
        arguments?: ASTNode[];
    };
    switch (callNode.callee?.property?.name) {
        case 'forward':
            return false;
        case 'back':
            return isInCondition(node, 3);
        case 'go': {
            const args = callNode.arguments;
            return !!args && args.length === 1 && isMinusOne(args[0]) && isInCondition(node, 3);
        }
        default:
    }
    return true;
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: RuleDefinition = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            historyManipulation:
                'Direct history manipulation, does not work with deep links, use router and navigation events instead'
        },
        schema: []
    },
    create(context: RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const HISTORY_OBJECTS: string[] = [];

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
         * Check if a call expression is interesting for history manipulation detection.
         *
         * @param node The call expression node to check
         * @returns True if the call expression is interesting for history manipulation detection
         */
        function isInteresting(node: ASTNode): boolean {
            // check if callee is ref to history.back / .go / .forward
            const callNode = node as BaseNode & { callee?: ASTNode };
            if (
                callNode &&
                isMember(callNode.callee) &&
                isHistoryObject((callNode.callee as BaseNode & { object?: ASTNode }).object) &&
                isIdentifier((callNode.callee as BaseNode & { property?: ASTNode }).property)
            ) {
                return true;
            }
            return false;
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
