/**
 * @file Detect the definition of global properties in the window object
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node is of a specific type.
 *
 * @param node The AST node to check
 * @param type The type to check for
 * @returns True if the node is of the specified type
 */
function isType(node: any, type: string): boolean {
    return node?.type === type;
}

/**
 * Check if an array contains a specific object.
 *
 * @param a The array to search in
 * @param obj The object to search for
 * @returns True if the array contains the object
 */
function contains(a: string[], obj: string): boolean {
    return a.includes(obj);
}

/**
 * Check if a node is an Identifier.
 *
 * @param node The AST node to check
 * @returns True if the node is an Identifier
 */
function isIdentifier(node: any): boolean {
    return isType(node, 'Identifier');
}

/**
 * Check if a node is a MemberExpression.
 *
 * @param node The AST node to check
 * @returns True if the node is a MemberExpression
 */
function isMember(node: any): boolean {
    return isType(node, 'MemberExpression');
}

/**
 * Check if a node represents the global window variable.
 *
 * @param node The AST node to check
 * @returns True if the node represents the global window variable
 */
function isWindow(node: any): boolean {
    // true if node is the global variable 'window'
    return isIdentifier(node) && node.name === 'window';
}

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
            globalDefine: 'Definition of global variable/api in window object is not permitted.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: string[] = [];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a node represents a window object or reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents a window object or reference to it
         */
        function isWindowObject(node: any): boolean {
            // true if node is the global variable 'window' or a reference to it
            return isWindow(node) || (node && isIdentifier(node) && contains(WINDOW_OBJECTS, node.name));
        }

        /**
         * Remember window object references for later analysis.
         *
         * @param left The left side of the assignment
         * @param right The right side of the assignment
         * @returns True if window object was remembered, false otherwise
         */
        function rememberWindow(left: any, right: any): boolean {
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
            'VariableDeclarator'(node: any): boolean {
                return rememberWindow(node.id, node.init);
            },
            'AssignmentExpression'(node: any): boolean {
                // check if anything is assigned to a window property
                if (isMember(node.left) && 'object' in node.left && isWindowObject(node.left.object)) {
                    context.report({ node: node, messageId: 'globalDefine' });
                }
                return rememberWindow(node.left, node.right);
            }
        };
    }
};

export default rule;
