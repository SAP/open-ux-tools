/**
 * @file Detect the definition of global properties in the window object
 */

import type { Rule } from 'eslint';
import type { ASTNode } from '../utils/helpers';
import { isIdentifier, isMember, isLiteral } from '../utils/helpers';

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
            forbiddenWindowProperty: 'Usage of a forbidden window property.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const FORBIDDEN_PROPERTIES = ['top', 'addEventListener'];

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a node represents the global window variable.
         *
         * @param node The AST node to check
         * @returns True if the node represents the global window variable
         */
        function isWindow(node: ASTNode | undefined): boolean {
            // true if node is the global variable 'window'
            return !!(isIdentifier(node) && node && 'name' in node && node.name === 'window');
        }

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
                (node && isIdentifier(node) && 'name' in node && WINDOW_OBJECTS.includes(node.name))
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
            if (isWindowObject(right) && isIdentifier(left) && 'name' in left) {
                WINDOW_OBJECTS.push(left.name);
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
            return isMember(node) && isWindowObject((node as any).object);
        }

        /**
         * Check if a window property access is valid (not forbidden).
         *
         * @param node The AST node to validate
         * @returns True if the window property access is valid
         */
        function isValid(node: ASTNode): boolean {
            let method = '';

            if (isIdentifier((node as any).property) && 'name' in (node as any).property) {
                method = (node as any).property.name;
            }

            if (isLiteral((node as any).property) && 'value' in (node as any).property) {
                method = (node as any).property.value;
            }
            return !FORBIDDEN_PROPERTIES.includes(method);
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node): boolean {
                return rememberWindow((node as any).id, (node as any).init);
            },
            'AssignmentExpression': function (node): boolean {
                return rememberWindow((node as any).left, (node as any).right);
            },
            'MemberExpression': function (node): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'forbiddenWindowProperty' });
                }
            }
        };
    }
};

export default rule;
