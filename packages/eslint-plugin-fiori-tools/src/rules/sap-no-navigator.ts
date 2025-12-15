/**
 * @file Detect usage of navigator object
 */

import type { Rule } from 'eslint';
import { type ASTNode } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 * Check if a node is of a specific type.
 *
 * @param node The AST node to check
 * @param type The type to check for
 * @returns True if the node is of the specified type
 */
function isType(node: ASTNode | undefined, type: string): boolean {
    return node?.type === type;
}

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            navigator: 'navigator usage is forbidden, use sap.ui.Device API instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_NAVIGATOR_WINDOW = ['javaEnabled'],
            FORBIDDEN_GLOB_EVENT = [
                'onload',
                'onunload',
                'onabort',
                'onbeforeunload',
                'onerror',
                'onhashchange',
                'onpageshow',
                'onpagehide',
                'onscroll',
                'onblur',
                'onchange',
                'onfocus',
                'onfocusin',
                'onfocusout',
                'oninput',
                'oninvalid',
                'onreset',
                'onsearch',
                'onselect',
                'onsubmit',
                'onresize'
            ];

        const FORBIDDEN_METHODS = FORBIDDEN_NAVIGATOR_WINDOW.concat(FORBIDDEN_GLOB_EVENT);
        FORBIDDEN_METHODS.push('back');

        const WINDOW_OBJECTS: string[] = [];
        const NAVIGATOR_OBJECTS: string[] = [];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: ASTNode | undefined): boolean {
            return isType(node, 'Identifier');
        }
        /**
         * Check if a node is a MemberExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a MemberExpression
         */
        function isMember(node: ASTNode | undefined): boolean {
            return isType(node, 'MemberExpression');
        }
        /**
         * Check if a node is a CallExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a CallExpression
         */
        function isCall(node: ASTNode | undefined): boolean {
            return isType(node, 'CallExpression');
        }

        /**
         * Get the rightmost method name from a call expression node.
         *
         * @param node The call expression node to analyze
         * @returns The rightmost method name
         */
        function getRightestMethodName(node: ASTNode): string {
            const callee = (node as any).callee;
            return isMember(callee) ? callee.property.name : callee.name;
        }

        /**
         * Check if a node represents the global window object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the global window object
         */
        function isWindow(node: ASTNode | undefined): boolean {
            // true if node is the global variable 'window'
            return !!(isIdentifier(node) && node && 'name' in node && node.name === 'window');
        }

        /**
         * Check if a node represents the window object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the window object or a reference to it
         */
        function isWindowObject(node: ASTNode | undefined): boolean {
            // true if node is the global variable 'window' or a reference to it
            return !!(
                isWindow(node) ||
                (isIdentifier(node) && node && 'name' in node && WINDOW_OBJECTS.includes(node.name))
            );
        }

        /**
         * Check if a node represents the navigator object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the navigator object
         */
        function isNavigator(node: ASTNode | undefined): boolean {
            // true if node id the global variable 'navigator', 'window.navigator' or '<windowReference>.navigator'
            return (
                (isIdentifier(node) && node && 'name' in node && node.name === 'navigator') ||
                (isMember(node) && isWindowObject((node as any).object) && isNavigator((node as any).property))
            );
        }

        /**
         * Check if a node represents the navigator object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the navigator object or a reference to it
         */
        function isNavigatorObject(node: ASTNode | undefined): boolean {
            // true if node is the global variable 'navigator'/'window.navigator' or a reference to it
            return !!(
                isNavigator(node) ||
                (isIdentifier(node) && node && 'name' in node && NAVIGATOR_OBJECTS.includes(node.name))
            );
        }

        /**
         * Remember window object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if the assignment was remembered
         */
        function rememberWindow(left: ASTNode, right: ASTNode): boolean {
            if (isWindowObject(right) && isIdentifier(left) && 'name' in left) {
                WINDOW_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         * Remember navigator object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if the assignment was remembered
         */
        function rememberNavigator(left: ASTNode, right: ASTNode): boolean {
            if (isNavigatorObject(right) && isIdentifier(left) && 'name' in left) {
                NAVIGATOR_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'VariableDeclarator': function (node: any): boolean {
                return rememberWindow(node.id, node.init) || rememberNavigator(node.id, node.init);
            },
            'AssignmentExpression': function (node: any): boolean {
                return rememberWindow(node.left, node.right) || rememberNavigator(node.left, node.right);
            },
            'MemberExpression': function (node: any): void {
                if (isNavigatorObject(node.object)) {
                    if (isCall(node.parent)) {
                        const methodName = getRightestMethodName(node.parent);
                        if (typeof methodName === 'string' && FORBIDDEN_METHODS.includes(methodName)) {
                            context.report({ node: node, messageId: 'navigator' });
                        }
                    } else {
                        context.report({ node: node, messageId: 'navigator' });
                    }
                }
            }
        };
    }
};

export default rule;
