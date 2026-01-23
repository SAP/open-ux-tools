/**
 * @file Detect the definition of global properties in the window object
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import type { ASTNode } from '../utils/helpers';
import {
    isIdentifier,
    getLiteralOrIdentifierName,
    asIdentifier,
    asMemberExpression,
    getPropertyName
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node represents the global window variable.
 *
 * @param node The AST node to check
 * @returns True if the node represents the global window variable
 */
function isWindow(node: ASTNode | undefined): boolean {
    // true if node is the global variable 'window'
    return !!(
        isIdentifier(node) &&
        node &&
        typeof node === 'object' &&
        node !== null &&
        'name' in node &&
        getLiteralOrIdentifierName(node) === 'window'
    );
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
            forbiddenWindowProperty: 'Usage of a forbidden window property.'
        },
        schema: []
    },
    create(context: RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const FORBIDDEN_PROPERTIES = new Set(['top', 'addEventListener']);

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a node represents a window object or reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents a window object or reference to it
         */
        function isWindowObject(node: ASTNode | undefined): boolean {
            // true if node is the global variable 'window' or a reference to it
            return !!(
                isWindow(node) ||
                (node &&
                    isIdentifier(node) &&
                    typeof node === 'object' &&
                    node !== null &&
                    'name' in node &&
                    WINDOW_OBJECTS.includes(getLiteralOrIdentifierName(node)))
            );
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
        function rememberWindow(left: ASTNode, right: ASTNode): boolean {
            const leftId = asIdentifier(left);
            if (isWindowObject(right) && leftId) {
                WINDOW_OBJECTS.push(leftId.name);
                return true;
            }
            return false;
        }

        /**
         * Check if a node represents an interesting window property access.
         *
         * @param node The AST node to check
         * @returns True if the node represents an interesting window property access
         */
        function isInteresting(node: ASTNode): boolean {
            const memberNode = asMemberExpression(node);
            return !!memberNode && isWindowObject(memberNode.object);
        }

        /**
         * Check if a window property access is valid (not forbidden).
         *
         * @param node The AST node to validate
         * @returns True if the window property access is valid
         */
        function isValid(node: ASTNode): boolean {
            const memberNode = asMemberExpression(node);
            if (!memberNode) {
                return true;
            }

            const method = getPropertyName(memberNode.property);
            return !method || !FORBIDDEN_PROPERTIES.has(method);
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node: any): boolean {
                return rememberWindow(node.id, node.init);
            },
            'AssignmentExpression': function (node: any): boolean {
                return rememberWindow(node.left, node.right);
            },
            'MemberExpression': function (node: any): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'forbiddenWindowProperty' });
                }
            }
        };
    }
};

export default rule;
