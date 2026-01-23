/**
 * @file Detects the usage of sap.ui.commons objects.
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    type ASTNode,
    isMember,
    isLiteral,
    isArray,
    startsWith,
    getMemberAsString,
    asCallExpression,
    asMemberExpression,
    asArrayExpression
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node represents an interesting function call to analyze.
 *
 * @param node The AST node to check
 * @returns True if the node represents an interesting function call
 */
function isInteresting(node: ASTNode): boolean {
    const callExpr = asCallExpression(node);
    if (!callExpr) {
        return false;
    }
    const memberCallee = asMemberExpression(callExpr.callee);
    if (memberCallee) {
        if (getMemberAsString(memberCallee) === 'sap.ui.define') {
            return true;
        }
    }
    return false;
}

/**
 * Check if a function call has valid (non-commons) imports.
 *
 * @param node The function call node to validate
 * @returns True if the function call has valid imports, false if it contains commons usage
 */
function isValid(node: ASTNode): boolean {
    const callExpr = asCallExpression(node);
    if (!callExpr) {
        return true;
    }
    if (callExpr.arguments && isArray(callExpr.arguments[0])) {
        const arrayExpr = asArrayExpression(callExpr.arguments[0]);
        if (arrayExpr) {
            const importList = arrayExpr.elements as any[];
            for (const key in importList) {
                if (importList.hasOwnProperty(key)) {
                    const lib = importList[key];
                    if (isLiteral(lib) && startsWith(lib.value, 'sap/ui/commons')) {
                        return false;
                    }
                }
            }
        }
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
            commonsUsage: 'Usage of sap.ui.commons controls is forbidden, please use controls from sap.m'
        },
        schema: []
    },
    create(context: RuleContext) {
        return {
            'NewExpression'(node: ASTNode): void {
                const nodeCallee = (node as { callee?: unknown }).callee;
                const memberCallee = nodeCallee ? asMemberExpression(nodeCallee) : undefined;
                if (memberCallee && startsWith(getMemberAsString(memberCallee), 'sap.ui.commons')) {
                    context.report({ node: node, messageId: 'commonsUsage' });
                }
            },
            'CallExpression'(node: ASTNode): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'commonsUsage' });
                }
            }
        };
    }
};

export default rule;
