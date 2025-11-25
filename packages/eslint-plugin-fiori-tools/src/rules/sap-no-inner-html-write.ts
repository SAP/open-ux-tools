/**
 * @file Detect the overriding of the innerHTML.
 */

import type { Rule } from 'eslint';
import {
    type ASTNode,
    type IdentifierNode,
    type LiteralNode,
    isIdentifier,
    isLiteral,
    isMember
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
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            innerHtmlWrite: 'Writing to the inner html is not allowed.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a left-hand side expression is interesting for analysis.
         *
         * @param left The left-hand side expression to check
         * @returns True if the expression is interesting for analysis
         */
        function isInteresting(left: ASTNode): boolean {
            return isMember(left);
        }

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

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'AssignmentExpression'(node: ASTNode): void {
                if (
                    isInteresting((node as any).left) &&
                    'property' in (node as any).left &&
                    !isValid((node as any).left.property)
                ) {
                    context.report({ node: node, messageId: 'innerHtmlWrite' });
                }
            }
        };
    }
};

export default rule;
