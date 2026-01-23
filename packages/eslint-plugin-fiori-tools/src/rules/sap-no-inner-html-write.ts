/**
 * @file Detect the overriding of the innerHTML.
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    type ASTNode,
    type IdentifierNode,
    type LiteralNode,
    isIdentifier,
    isLiteral,
    asAssignmentExpression,
    asMemberExpression
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

/**
 * Check if a property access is valid (not innerHTML).
 *
 * @param property The property node to validate
 * @returns True if the property access is valid
 */
function isValid(property: ASTNode): boolean {
    // anything is valid, except 'innerHTML'
    if (isIdentifier(property)) {
        return (property as IdentifierNode).name !== 'innerHTML';
    } else if (isLiteral(property)) {
        return (property as LiteralNode).value !== 'innerHTML';
    }
    return true;
}

const rule: RuleDefinition = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            innerHtmlWrite: 'Writing to the inner html is not allowed.'
        },
        schema: []
    },
    create(context: RuleContext) {
        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'AssignmentExpression'(node: ASTNode): void {
                const assignExpr = asAssignmentExpression(node);
                if (!assignExpr) {
                    return;
                }
                const leftMember = asMemberExpression(assignExpr.left);
                if (leftMember && !isValid(leftMember.property)) {
                    context.report({ node: node, messageId: 'innerHtmlWrite' });
                }
            }
        };
    }
};

export default rule;
